import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

interface GetUserByAddressRequest {
  address: string;
}

interface GetUserByAddressResponse {
  success: boolean;
  user?: {
    id: string;
    address: string;
    username: string | null;
    profileImageURL: string | null;
    backgroundImageURL: string | null;
    createdAt: Date;
    updatedAt: Date;
    totalWinnedGames: number;
    totalJoinedGames: number;
    totalFirstWinnedGames: number;
    totalSecondWinnedGames: number;
    totalThirdWinnedGames: number;
    totalEarned: string;
    totalSpent: string;
    earnedMinusSpent: string;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetUserByAddressResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', success: false });
  }

  try {
    const { address }: GetUserByAddressRequest = req.body;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Address is required', success: false });
    }

    const normalizedAddress = address.toLowerCase();

    const user = await prisma.userAccount.findUnique({
      where: { address: normalizedAddress },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found', success: false });
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
        totalWinnedGames: user.totalWinnedGames,
        totalJoinedGames: user.totalJoinedGames,
        totalFirstWinnedGames: user.totalFirstWinnedGames,
        totalSecondWinnedGames: user.totalSecondWinnedGames,
        totalThirdWinnedGames: user.totalThirdWinnedGames,
        totalEarned: user.totalEarned,
        totalSpent: user.totalSpent,
        earnedMinusSpent: user.earnedMinusSpent,
      },
    });
  } catch (error) {
    console.error('Error getting user by address:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user',
    });
  }
}

