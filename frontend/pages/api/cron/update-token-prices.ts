import {
  getNativeCoinHistoricalPrices,
  getNativeCoinPrice,
  getPlatformId,
  getTokenContractAddress,
  getTokenCurrentPrice,
  getTokenHistoricalPrices,
  searchTokenBySymbol,
} from '@/lib/coingecko-proxy';
import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface PriceData {
  currentPrice: string | null;
  price20m: string | null;
  price1h: string | null;
  price4h: string | null;
  price8h: string | null;
  price24h: string | null;
  price7d: string | null;
  price30d: string | null;
}

async function fetchTokenPrices(
  tokenAddress: string,
  symbol: string,
  platformId: string,
  chainId: number
): Promise<{ priceData: PriceData; contractInfo: { address: string; platformId: string } | null } | null> {
  try {
    const coingeckoId = await searchTokenBySymbol(symbol);
    if (!coingeckoId) {
      return null;
    }

    const contractInfo = await getTokenContractAddress(coingeckoId, platformId);

    let currentPrice: number | null = null;
    let prices: [number, number][] | null = null;

    if (contractInfo) {
      currentPrice = await getTokenCurrentPrice(contractInfo.address, contractInfo.platformId, chainId);

      if (currentPrice) {
        await delay(500);
        prices = await getTokenHistoricalPrices(contractInfo.address, contractInfo.platformId, 30);
      }
    } else {
      currentPrice = await getNativeCoinPrice(coingeckoId);

      if (currentPrice) {
        await delay(500);
        prices = await getNativeCoinHistoricalPrices(coingeckoId, 30);
      }
    }

    if (!currentPrice) {
      return null;
    }
    if (!prices || prices.length === 0) {
      return {
        priceData: {
          currentPrice: currentPrice.toString(),
          price20m: null,
          price1h: null,
          price4h: null,
          price8h: null,
          price24h: null,
          price7d: null,
          price30d: null,
        },
        contractInfo: contractInfo || null,
      };
    }

    const now = Date.now();
    const twentyMinutesAgo = now - (20 * 60 * 1000);
    const oneHourAgo = now - (60 * 60 * 1000);
    const fourHoursAgo = now - (4 * 60 * 60 * 1000);
    const eightHoursAgo = now - (8 * 60 * 60 * 1000);
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    const findClosestPrice = (targetTime: number): number | null => {
      const closest = prices.find((p: [number, number]) => p[0] >= targetTime) || prices[0];
      return closest ? closest[1] : null;
    };

    return {
      priceData: {
        currentPrice: currentPrice.toString(),
        price20m: findClosestPrice(twentyMinutesAgo)?.toString() || null,
        price1h: findClosestPrice(oneHourAgo)?.toString() || null,
        price4h: findClosestPrice(fourHoursAgo)?.toString() || null,
        price8h: findClosestPrice(eightHoursAgo)?.toString() || null,
        price24h: findClosestPrice(twentyFourHoursAgo)?.toString() || null,
        price7d: findClosestPrice(sevenDaysAgo)?.toString() || null,
        price30d: findClosestPrice(thirtyDaysAgo)?.toString() || null,
      },
      contractInfo: contractInfo || null,
    };
  } catch (error: any) {
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; updated: number; errors: number } | { error: string }>
) {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const vercelCron = req.headers['x-vercel-cron'];
    if (!vercelCron) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const tokens = await prisma.gameToken.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        address: true,
        symbol: true,
        chainId: true,
      },
    });

    if (!tokens || tokens.length === 0) {
      return res.status(200).json({ success: true, updated: 0, errors: 0 });
    }

    let updated = 0;
    let errors = 0;

    const batchSize = 3;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);

      const batchPromises = batch.map(async (token) => {
        const platformId = getPlatformId(token.chainId);
        if (!platformId) {
          return false;
        }

        const result = await fetchTokenPrices(token.address, token.symbol, platformId, token.chainId);

        if (!result || !result.priceData) {
          errors++;
          return false;
        }

        const { priceData, contractInfo } = result;

        try {
          let actualChainId: number | null = null;
          if (contractInfo) {
            const platformToChainId: { [key: string]: number } = {
              'ethereum': 1,
              'polygon-pos': 137,
              'binance-smart-chain': 56,
              'base': 8453,
            };
            actualChainId = platformToChainId[contractInfo.platformId] || null;
          }

          await prisma.gameToken.update({
            where: { id: token.id },
            data: {
              ...priceData,
              chainId: actualChainId ?? token.chainId,
              coingeckoPlatformId: contractInfo?.platformId || null,
              lastPriceUpdate: new Date(),
            },
          });
          updated++;
          return true;
        } catch (error: any) {
          errors++;
          return false;
        }
      });

      await Promise.all(batchPromises);

      if (i + batchSize < tokens.length) {
        await delay(2000);
      }
    }


    return res.status(200).json({
      success: true,
      updated,
      errors,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update token prices',
    });
  }
}

