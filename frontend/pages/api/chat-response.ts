import type { NextApiRequest, NextApiResponse } from 'next';
import { generateChatResponse } from '../../../backend/services/ai/chat-service';
import type { ChatRequest, ChatResponse } from '../../../backend/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const request: ChatRequest = req.body;
    const result = await generateChatResponse(request);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ 
      error: error?.message || 'Failed to generate chat response',
    });
  }
}
