import type { NextApiRequest, NextApiResponse } from 'next';
import { queryDatabase } from '../../../backend/services/database/query-service';
import type { DatabaseQueryRequest, DatabaseQueryResponse } from '../../../backend/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DatabaseQueryResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', success: false });
  }

  try {
    const { query, context }: DatabaseQueryRequest = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required', success: false });
    }

    const result = await queryDatabase({ query, context });

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to query database',
    });
  }
}
