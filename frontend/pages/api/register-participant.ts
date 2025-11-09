import type { NextApiRequest, NextApiResponse } from 'next';

export interface RegisterParticipantRequest {
  gameId: number;
  userAddress: string;
  captainCoin: string;
  chainId: number;
  coinFeeds?: string[];
  affiliate?: string;
}

export interface RegisterParticipantResponse {
  success: boolean;
  participantId?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RegisterParticipantResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const request: RegisterParticipantRequest = req.body;

    if (!request.gameId || request.gameId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid game ID' });
    }

    if (!request.userAddress) {
      return res.status(400).json({ success: false, error: 'User address is required' });
    }

    if (!request.captainCoin) {
      return res.status(400).json({ success: false, error: 'Captain coin is required' });
    }

    if (!request.chainId) {
      return res.status(400).json({ success: false, error: 'Chain ID is required' });
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
    const response = await fetch(`${backendUrl}/api/register-participant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error registering participant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to register participant';
    return res.status(500).json({ success: false, error: errorMessage });
  }
}

