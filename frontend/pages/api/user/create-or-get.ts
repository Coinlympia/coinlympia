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
  console.log('[create-or-get] Request received:', { method: req.method, body: req.body });
  
  if (req.method !== 'POST') {
    console.log('[create-or-get] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed', success: false });
  }

  try {
    const { address }: CreateOrGetUserRequest = req.body;
    console.log('[create-or-get] Address received:', address);

    if (!address || typeof address !== 'string') {
      console.error('[create-or-get] Invalid address:', address);
      return res.status(400).json({ error: 'Address is required', success: false });
    }

    const normalizedAddress = address.toLowerCase();
    console.log('[create-or-get] Normalized address:', normalizedAddress);

    console.log('[create-or-get] Checking for existing user...');
    let user = await prisma.userAccount.findUnique({
      where: { address: normalizedAddress },
    });

    if (!user) {
      console.log('[create-or-get] User not found, creating new user...');
      const username = await generateUniqueUsername();
      console.log('[create-or-get] Generated username:', username);
      
      try {
      user = await prisma.userAccount.create({
        data: {
          address: normalizedAddress,
          username,
        },
      });
        console.log('[create-or-get] User created successfully:', { id: user.id, address: user.address, username: user.username });
      } catch (createError: any) {
        if (createError?.code === 'P2002' && createError?.meta?.target?.includes('address')) {
          console.log('[create-or-get] User was created by another request, fetching existing user...');
          user = await prisma.userAccount.findUnique({
            where: { address: normalizedAddress },
          });
          if (!user) {
            throw createError;
          }
          console.log('[create-or-get] User found after race condition:', { id: user.id, address: user.address, username: user.username });
        } else {
          throw createError;
        }
      }
    } else {
      console.log('[create-or-get] User already exists:', { id: user.id, address: user.address, username: user.username });
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
    console.error('[create-or-get] Error creating or getting user:', error);
    if (error instanceof Error) {
      console.error('[create-or-get] Error message:', error.message);
      console.error('[create-or-get] Error stack:', error.stack);
    }
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create or get user',
    });
  }
}

