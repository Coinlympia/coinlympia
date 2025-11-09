import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ChainId } from '@/modules/common/constants/enums';

interface GetAllAddressesRequest {
  addresses: string[];
}

interface GameProfile {
  id: string;
  address: string;
  user: {
    username: string;
    backgroundImageURL: string | null;
    profileImageURL: string | null;
  };
  tokenAddress: string;
  tokenId: string;
  chainId: ChainId;
}

interface GetAllAddressesResponse {
  success: boolean;
  profiles?: GameProfile[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetAllAddressesResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', success: false });
  }

  try {
    const { addresses }: GetAllAddressesRequest = req.body;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({ error: 'Addresses array is required', success: false });
    }

    const normalizedAddresses = addresses.map(addr => addr.toLowerCase());

    const users = await prisma.userAccount.findMany({
      where: {
        address: {
          in: normalizedAddresses,
        },
      },
      select: {
        id: true,
        address: true,
        username: true,
        profileImageURL: true,
        backgroundImageURL: true,
      },
    });

    const userMap = new Map<string, typeof users[0]>();
    users.forEach(user => {
      userMap.set(user.address.toLowerCase(), user);
    });

    const profiles: GameProfile[] = addresses.map(address => {
      const normalizedAddress = address.toLowerCase();
      const user = userMap.get(normalizedAddress);
      if (user) {
        return {
          id: user.id,
          address: user.address,
          user: {
            username: user.username || '',
            backgroundImageURL: user.backgroundImageURL || '',
            profileImageURL: user.profileImageURL || '',
          },
          tokenAddress: '',
          tokenId: '',
          chainId: ChainId.Polygon,
        };
      } else {
        return {
          id: '',
          address: address,
          user: {
            username: '',
            backgroundImageURL: '',
            profileImageURL: '',
          },
          tokenAddress: '',
          tokenId: '',
          chainId: ChainId.Polygon,
        };
      }
    });

    return res.status(200).json({
      success: true,
      profiles,
    });
  } catch (error) {
    console.error('Error getting profiles by addresses:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get profiles',
    });
  }
}

