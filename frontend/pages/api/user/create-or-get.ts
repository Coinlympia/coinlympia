import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

const adjectives = [
  'swift', 'brave', 'clever', 'bright', 'calm', 'bold', 'cool', 'daring', 'eager', 'fierce',
  'gentle', 'happy', 'jolly', 'keen', 'lively', 'mighty', 'noble', 'proud', 'quick', 'radiant',
  'sharp', 'tough', 'vivid', 'witty', 'zealous', 'active', 'bold', 'calm', 'daring', 'eager',
  'fierce', 'gentle', 'happy', 'jolly', 'keen', 'lively', 'mighty', 'noble', 'proud', 'quick',
  'radiant', 'sharp', 'tough', 'vivid', 'witty', 'zealous', 'ancient', 'brilliant', 'crystal', 'dynamic',
  'electric', 'fantastic', 'glorious', 'heroic', 'infinite', 'jubilant', 'legendary', 'mystic', 'noble', 'optimistic'
];

const nouns = [
  'tiger', 'eagle', 'wolf', 'lion', 'bear', 'hawk', 'fox', 'panther', 'jaguar', 'leopard',
  'falcon', 'raven', 'phoenix', 'dragon', 'unicorn', 'griffin', 'sphinx', 'kraken', 'basilisk', 'chimera',
  'warrior', 'knight', 'ranger', 'wizard', 'mage', 'rogue', 'paladin', 'druid', 'bard', 'monk',
  'archer', 'berserker', 'assassin', 'necromancer', 'sorcerer', 'cleric', 'barbarian', 'fighter', 'thief', 'priest',
  'star', 'moon', 'sun', 'comet', 'nebula', 'galaxy', 'planet', 'asteroid', 'meteor', 'cosmos',
  'storm', 'thunder', 'lightning', 'hurricane', 'tornado', 'blizzard', 'tsunami', 'volcano', 'earthquake', 'avalanche', 'degen'
];

function generateRandomUsername(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective}-${noun}`;
}

async function generateUniqueUsername(maxAttempts = 10): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const username = generateRandomUsername();
    const existing = await prisma.userAccount.findUnique({
      where: { username },
    });
    if (!existing) {
      return username;
    }
  }
  const baseUsername = generateRandomUsername();
  const randomSuffix = Math.floor(Math.random() * 10000);
  return `${baseUsername}-${randomSuffix}`;
}

interface CreateOrGetUserRequest {
  address: string;
}

interface CreateOrGetUserResponse {
  success: boolean;
  user?: {
    id: string;
    address: string;
    username: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateOrGetUserResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', success: false });
  }

  try {
    const { address }: CreateOrGetUserRequest = req.body;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Address is required', success: false });
    }

    const normalizedAddress = address.toLowerCase();

    let user = await prisma.userAccount.findUnique({
      where: { address: normalizedAddress },
    });

    if (!user) {
      const username = await generateUniqueUsername();
      user = await prisma.userAccount.create({
        data: {
          address: normalizedAddress,
          username,
        },
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        address: user.address,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error creating or getting user:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create or get user',
    });
  }
}

