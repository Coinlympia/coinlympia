import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

interface ChartDataPoint {
  timestamp: number;
  price: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; data?: ChartDataPoint[]; historicalPrice?: number | null; currentPrice?: number | null; error?: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { tokenAddress, symbol, chainId, timePeriod } = req.body;

    if (!tokenAddress && !symbol) {
      return res.status(400).json({ success: false, error: 'Token address or symbol is required' });
    }

    if (!chainId) {
      return res.status(400).json({ success: false, error: 'Chain ID is required' });
    }

    let tokenFromDb = null;

    if (prisma && prisma.gameToken) {
      const whereConditions: any[] = [];
      
      if (tokenAddress) {
        whereConditions.push({ address: tokenAddress.toLowerCase() });
      }
      
      if (symbol) {
        whereConditions.push({ symbol: { equals: symbol, mode: 'insensitive' } });
      }

      if (whereConditions.length > 0) {
        try {
          tokenFromDb = await prisma.gameToken.findFirst({
            where: {
              OR: whereConditions,
              chainId,
              isActive: true,
            },
            select: {
              currentPrice: true,
              price20m: true,
              price1h: true,
              price4h: true,
              price8h: true,
              price24h: true,
              price7d: true,
              price30d: true,
              lastPriceUpdate: true,
            },
          });
        } catch (dbError) {
          return res.status(500).json({ success: false, error: 'Database error' });
        }
      }
    }

    if (!tokenFromDb) {
      return res.status(404).json({ success: false, error: 'Token not found in database' });
    }

    const now = tokenFromDb.lastPriceUpdate 
      ? new Date(tokenFromDb.lastPriceUpdate).getTime() 
      : Date.now();
    
    const chartData: ChartDataPoint[] = [];
    
    const addDataPoint = (timestamp: number, priceStr: string | null) => {
      if (priceStr) {
        const price = parseFloat(priceStr);
        if (!isNaN(price) && price > 0) {
          chartData.push({ timestamp, price });
        }
      }
    };

    if (tokenFromDb.price30d) {
      addDataPoint(now - (30 * 24 * 60 * 60 * 1000), tokenFromDb.price30d);
    }
    
    if (tokenFromDb.price7d) {
      addDataPoint(now - (7 * 24 * 60 * 60 * 1000), tokenFromDb.price7d);
    }
    
    if (tokenFromDb.price24h) {
      addDataPoint(now - (24 * 60 * 60 * 1000), tokenFromDb.price24h);
    }
    
    if (tokenFromDb.price8h) {
      addDataPoint(now - (8 * 60 * 60 * 1000), tokenFromDb.price8h);
    }
    
    if (tokenFromDb.price4h) {
      addDataPoint(now - (4 * 60 * 60 * 1000), tokenFromDb.price4h);
    }
    
    if (tokenFromDb.price1h) {
      addDataPoint(now - (60 * 60 * 1000), tokenFromDb.price1h);
    }
    
    if (tokenFromDb.price20m) {
      addDataPoint(now - (20 * 60 * 1000), tokenFromDb.price20m);
    }
    
    if (tokenFromDb.currentPrice) {
      addDataPoint(now, tokenFromDb.currentPrice);
    }

    chartData.sort((a, b) => a.timestamp - b.timestamp);

    if (chartData.length === 0) {
      return res.status(404).json({ success: false, error: 'No historical price data available for this token' });
    }

    let historicalPriceForPeriod: number | null = null;
    if (timePeriod) {
      const timePeriodLower = timePeriod.toLowerCase().trim();
      if (timePeriodLower.includes('20m') || timePeriodLower.includes('20 minutes')) {
        historicalPriceForPeriod = tokenFromDb.price20m ? parseFloat(tokenFromDb.price20m) : null;
      } else if (timePeriodLower.includes('1h') || timePeriodLower.includes('1 hour')) {
        historicalPriceForPeriod = tokenFromDb.price1h ? parseFloat(tokenFromDb.price1h) : null;
      } else if (timePeriodLower.includes('4h') || timePeriodLower.includes('4 hours')) {
        historicalPriceForPeriod = tokenFromDb.price4h ? parseFloat(tokenFromDb.price4h) : null;
      } else if (timePeriodLower.includes('8h') || timePeriodLower.includes('8 hours')) {
        historicalPriceForPeriod = tokenFromDb.price8h ? parseFloat(tokenFromDb.price8h) : null;
      } else if (timePeriodLower.includes('past week') || timePeriodLower.includes('7d') || timePeriodLower.includes('week') || 
                 timePeriodLower.includes('7 days') || timePeriodLower === '1w' || timePeriodLower.startsWith('1w')) {
        historicalPriceForPeriod = tokenFromDb.price7d ? parseFloat(tokenFromDb.price7d) : null;
      } else if (timePeriodLower.includes('past month') || timePeriodLower.includes('30d') || timePeriodLower.includes('month') || 
                 timePeriodLower.includes('30 days') || timePeriodLower.includes('year') || timePeriodLower.includes('1y') || 
                 timePeriodLower.includes('12m') || timePeriodLower.includes('past year')) {
        historicalPriceForPeriod = tokenFromDb.price30d ? parseFloat(tokenFromDb.price30d) : null;
      } else {
        historicalPriceForPeriod = tokenFromDb.price24h ? parseFloat(tokenFromDb.price24h) : null;
      }
    }

    const currentPrice = tokenFromDb.currentPrice ? parseFloat(tokenFromDb.currentPrice) : null;
    
    if (historicalPriceForPeriod === null && timePeriod) {
      const timePeriodLower = timePeriod.toLowerCase().trim();
      if (timePeriodLower.includes('past week') || timePeriodLower.includes('week') || timePeriodLower.includes('7d') || 
          timePeriodLower === '1w' || timePeriodLower.startsWith('1w')) {
        historicalPriceForPeriod = tokenFromDb.price7d ? parseFloat(tokenFromDb.price7d) : null;
      } else if (timePeriodLower.includes('day') || timePeriodLower.includes('24h') || timePeriodLower === '24h') {
        historicalPriceForPeriod = tokenFromDb.price24h ? parseFloat(tokenFromDb.price24h) : null;
      } else if (timePeriodLower.includes('past month') || timePeriodLower.includes('month') || timePeriodLower.includes('30d') || timePeriodLower.includes('30 days')) {
        historicalPriceForPeriod = tokenFromDb.price30d ? parseFloat(tokenFromDb.price30d) : null;
      }
    }

    res.status(200).json({ 
      success: true, 
      data: chartData,
      historicalPrice: historicalPriceForPeriod,
      currentPrice: currentPrice,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

