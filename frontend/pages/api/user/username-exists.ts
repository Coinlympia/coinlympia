import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', exists: false });
  }

  try {
    const { username, currentUsername } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required', exists: false });
    }

    if (currentUsername && username.toLowerCase() === currentUsername.toLowerCase()) {
      return res.status(200).json({ exists: false });
    }
    
    const result = await prisma.$queryRaw<Array<{ username: string }>>`
      SELECT username FROM "user_accounts" 
      WHERE LOWER(username) = LOWER(${username})
      LIMIT 1
    `;

    return res.status(200).json({ exists: result.length > 0 });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', exists: false });
  }
}

