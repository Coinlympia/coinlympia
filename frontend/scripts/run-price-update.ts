import {
  getNativeCoinHistoricalPrices,
  getNativeCoinPrice,
  getPlatformId,
  getTokenContractAddress,
  getTokenCurrentPrice,
  getTokenHistoricalPrices,
  searchTokenBySymbol,
} from '../src/lib/coingecko-proxy';
import { prisma } from '../src/lib/prisma';

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
    console.log(`  Searching for ${symbol} in CoinGecko...`);
    const coingeckoId = await searchTokenBySymbol(symbol);
    if (!coingeckoId) {
      console.warn(`  Token ${symbol} not found in CoinGecko`);
      return null;
    }

    console.log(`  Searching for ${symbol} contract address (preferred: ${platformId})...`);
    const contractInfo = await getTokenContractAddress(coingeckoId, platformId);

    let currentPrice: number | null = null;
    let prices: [number, number][] | null = null;

    if (contractInfo) {
      console.log(`  Found contract address for ${symbol}: ${contractInfo.address} on ${contractInfo.platformId} (original oracle: ${tokenAddress})`);

      currentPrice = await getTokenCurrentPrice(contractInfo.address, contractInfo.platformId, chainId);

      if (currentPrice) {
        await delay(500);
        prices = await getTokenHistoricalPrices(contractInfo.address, contractInfo.platformId, 30);
      }
    } else {
      console.log(`  No contract found for ${symbol}, trying as native coin (${coingeckoId})...`);
      currentPrice = await getNativeCoinPrice(coingeckoId);

      if (currentPrice) {
        await delay(500);
        prices = await getNativeCoinHistoricalPrices(coingeckoId, 30);
      }
    }

    if (!currentPrice) {
      console.warn(`  No price found for ${symbol} (${coingeckoId})`);
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
    console.error(`Error fetching prices for token ${tokenAddress}:`, error.message);
    return null;
  }
}

async function main() {
  try {
    console.log('Starting price update...');

    const apiKey = process.env.COINGECKO_API_KEY;
    if (apiKey) {
      console.log('✓ CoinGecko Pro API key detected');
    } else {
      console.warn('⚠ No CoinGecko API key found, using free tier (limited rate)');
    }

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
      console.log('No active tokens found');
      return;
    }

    console.log(`Found ${tokens.length} active tokens`);

    const testTokenAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // USDC en Polygon
    const testPlatformId = getPlatformId(137);
    if (testPlatformId) {
      console.log(`\nTesting with known token (USDC): ${testTokenAddress}...`);
      const testPrice = await getTokenCurrentPrice(testTokenAddress, testPlatformId, 137);
      if (testPrice) {
        console.log(`✓ Test successful! USDC price: $${testPrice}`);
      } else {
        console.warn(`⚠ Test failed - USDC not found. This might indicate an API issue.`);
      }
      console.log('');
    }

    let updated = 0;
    let errors = 0;

    const batchSize = 3;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);

      const batchPromises = batch.map(async (token) => {
        const platformId = getPlatformId(token.chainId);
        if (!platformId) {
          console.warn(`Chain ${token.chainId} not supported for token ${token.symbol}`);
          return false;
        }

        console.log(`Fetching prices for ${token.symbol} (${token.address}) on chain ${token.chainId}...`);
        const result = await fetchTokenPrices(token.address, token.symbol, platformId, token.chainId);

        if (!result || !result.priceData) {
          console.warn(`Failed to fetch prices for ${token.symbol} (${token.address})`);
          errors++;
          return false;
        }

        const { priceData, contractInfo } = result;

        if (!priceData.currentPrice) {
          console.warn(`No current price found for ${token.symbol} (${token.address})`);
          errors++;
          return false;
        }

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
          console.log(`✓ Updated prices for ${token.symbol}${contractInfo ? ` (on ${contractInfo.platformId})` : ' (native coin)'}`);
          updated++;
          return true;
        } catch (error: any) {
          console.error(`Error updating token ${token.symbol}:`, error.message);
          errors++;
          return false;
        }
      });

      await Promise.all(batchPromises);

      if (i + batchSize < tokens.length) {
        await delay(2000);
      }
    }

    console.log(`\nPrice update completed: ${updated} tokens updated, ${errors} errors`);
  } catch (error: any) {
    console.error('Error in price update:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

