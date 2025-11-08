import type { NextApiRequest, NextApiResponse } from 'next';
import { generateChatResponse } from '../../../backend/services/ai/chat-service';
import type { ChatRequest, ChatResponse } from '../../../backend/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse | { error: string; message?: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const request: ChatRequest = req.body;
    console.log('[Chat Response API] Request received:', {
      messageLength: request.message?.length || 0,
      hasGameJoinState: !!request.gameJoinState,
      gameJoinState: request.gameJoinState,
    });
    const result = await generateChatResponse(request);
    console.log('[Chat Response API] Response generated:', {
      hasResponse: !!result.response,
      responseLength: result.response?.length || 0,
      responsePreview: result.response?.substring(0, 200) || '',
      hasAction: !!result.action,
      actionType: result.action?.type,
      gameJoinState: request.gameJoinState,
    });
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[Chat Response API] Error generating chat response:', error);
    return res.status(500).json({ 
      error: 'Failed to generate chat response',
      message: error?.message || 'Unknown error',
    });
  }
}
