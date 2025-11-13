import type { NextApiRequest, NextApiResponse } from 'next';
import { parseGameRequest } from '../../../backend/services/ai/game-creation-service';
import type { GameParams } from '../../../backend/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GameParams | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const validatedParams = await parseGameRequest(text);
    return res.status(200).json(validatedParams);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to parse game request' });
  }
}
