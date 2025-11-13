import type { NextApiRequest, NextApiResponse } from 'next';
import { analyzeTokens } from '../../../backend/services/ai/token-analysis-service';
import type { TokenAnalysisRequest, TokenPerformance } from '../../../backend/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ tokens: TokenPerformance[]; timePeriod: string } | { error: string; message?: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, chainId }: TokenAnalysisRequest = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  if (!chainId) {
    return res.status(400).json({ error: 'ChainId is required' });
  }

  try {
    const result = await analyzeTokens({ text, chainId });
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ 
      error: 'Failed to analyze tokens',
      message: error?.message || 'Unknown error',
    });
  }
}
