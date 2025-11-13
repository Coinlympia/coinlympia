import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

interface ChartDataPoint {
  timestamp: number;
  price: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; data?: ChartDataPoint[]; error?: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { tokenAddress, symbol, chainId } = req.body;

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
          console.error('Database error:', dbError);
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

    res.status(200).json({ success: true, data: chartData });
  } catch (error: any) {
    console.error('Error fetching token chart data:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

