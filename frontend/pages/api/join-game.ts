import type { NextApiRequest, NextApiResponse } from 'next';
import type { JoinGameRequest, JoinGameResponse } from '../../../backend/types';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JoinGameResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const request: JoinGameRequest = req.body;

    if (!request.gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    if (!request.selectedCoins || request.selectedCoins.length === 0) {
      return res.status(400).json({ error: 'Selected coins are required' });
    }

    if (!request.chainId) {
      return res.status(400).json({ error: 'Chain ID is required' });
    }

    if (!request.maxCoins || request.maxCoins < 2) {
      return res.status(400).json({ error: 'Max coins must be at least 2' });
    }

    const backendResponse = await fetch(`${BACKEND_URL}/api/join-game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({ error: 'Backend request failed' }));
      return res.status(backendResponse.status).json(errorData);
    }

    const result: JoinGameResponse = await backendResponse.json();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error calling backend join-game service:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to prepare join game';
    return res.status(500).json({ error: errorMessage });
  }
}

