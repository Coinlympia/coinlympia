import type { NextApiRequest, NextApiResponse } from 'next';
import type { FindGamesRequest, FindGamesResponse } from '../../../backend/types';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FindGamesResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const request: FindGamesRequest = req.body;

    const backendResponse = await fetch(`${BACKEND_URL}/api/find-games`, {
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

    const result: FindGamesResponse = await backendResponse.json();
    return res.status(200).json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to find games';
    return res.status(500).json({ error: errorMessage });
  }
}

