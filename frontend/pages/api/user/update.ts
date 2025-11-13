import { prisma } from '@/lib/prisma';
import { userCache } from '@/lib/cache';
import type { NextApiRequest, NextApiResponse } from 'next';

interface UpdateUserRequest {
  address: string;
  username?: string;
  profileImageURL?: string;
  backgroundImageURL?: string;
}

interface UpdateUserResponse {
  success: boolean;
  user?: {
    id: string;
    address: string;
    username: string | null;
    profileImageURL: string | null;
    backgroundImageURL: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateUserResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', success: false });
  }

  try {
    const { address, username, profileImageURL, backgroundImageURL }: UpdateUserRequest = req.body;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Address is required', success: false });
    }

    const normalizedAddress = address.toLowerCase();

    const existingUser = await prisma.userAccount.findUnique({
      where: { address: normalizedAddress },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found', success: false });
    }

    if (username && username.toLowerCase() !== existingUser.username?.toLowerCase()) {
      const result = await prisma.$queryRaw<Array<{ username: string }>>`
        SELECT username FROM "user_accounts" 
        WHERE LOWER(username) = LOWER(${username})
        LIMIT 1
      `;

      if (result.length > 0) {
        return res.status(400).json({ error: 'Username already taken', success: false });
      }
    }

    const updateData: {
      username?: string;
      profileImageURL?: string | null;
      backgroundImageURL?: string | null;
    } = {};

    if (username !== undefined && username !== null && username.trim() !== '') {
      updateData.username = username.trim();
    }
    if (profileImageURL !== undefined) {
      updateData.profileImageURL = profileImageURL && profileImageURL.trim() !== '' ? profileImageURL.trim() : null;
    }
    if (backgroundImageURL !== undefined) {
      updateData.backgroundImageURL = backgroundImageURL && backgroundImageURL.trim() !== '' ? backgroundImageURL.trim() : null;
    }

    const user = await prisma.userAccount.update({
      where: { address: normalizedAddress },
      data: updateData,
    });

    userCache.delete(`user:address:${normalizedAddress}`);
    if (user.username) {
      userCache.delete(`user:username:${user.username.toLowerCase()}`);
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        address: user.address,
        username: user.username,
        profileImageURL: user.profileImageURL,
        backgroundImageURL: user.backgroundImageURL,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user',
    });
  }
}

