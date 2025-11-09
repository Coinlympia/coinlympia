import { prisma } from '../../../frontend/src/lib/prisma';
import { ethers } from 'ethers';

export interface RegisterParticipantRequest {
  gameId: number;
  userAddress: string;
  captainCoin: string;
  chainId: number;
  coinFeeds?: string[];
  affiliate?: string;
}

export interface RegisterParticipantResponse {
  success: boolean;
  participantId?: string;
  error?: string;
}

export async function registerGameParticipant(
  request: RegisterParticipantRequest
): Promise<RegisterParticipantResponse> {
  console.log(`[registerGameParticipant] Function called with request:`, JSON.stringify(request, null, 2));
  try {
    const { gameId, userAddress, captainCoin, chainId, coinFeeds = [], affiliate } = request;
    console.log(`[registerGameParticipant] Extracted parameters:`, { gameId, userAddress, captainCoin, chainId, coinFeedsCount: coinFeeds.length, affiliate });

    if (!gameId || gameId <= 0) {
      return { success: false, error: 'Invalid game ID' };
    }

    if (!userAddress || !ethers.utils.isAddress(userAddress)) {
      return { success: false, error: 'Invalid user address' };
    }

    if (!captainCoin || !ethers.utils.isAddress(captainCoin)) {
      return { success: false, error: 'Invalid captain coin address' };
    }

    if (!chainId) {
      return { success: false, error: 'Chain ID is required' };
    }

    const normalizedUserAddress = userAddress.toLowerCase();
    const normalizedCaptainCoin = ethers.utils.getAddress(captainCoin).toLowerCase();

    let game = await prisma.game.findFirst({
      where: {
        intId: gameId,
        chainId: chainId,
      },
      select: {
        id: true,
        intId: true,
        chainId: true,
      },
    });

    if (!game) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      game = await prisma.game.findFirst({
        where: {
          intId: gameId,
          chainId: chainId,
        },
        select: {
          id: true,
          intId: true,
          chainId: true,
        },
      });
    }

    if (!game) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      game = await prisma.game.findFirst({
        where: {
          intId: gameId,
          chainId: chainId,
        },
        select: {
          id: true,
          intId: true,
          chainId: true,
        },
      });
    }

    if (!game) {
      console.error(`Game with intId ${gameId} and chainId ${chainId} not found in database`);
      console.error('This might mean the game was not created in the database yet');
      return { success: false, error: `Game with intId ${gameId} and chainId ${chainId} not found in database. The game might not have been created in the database yet.` };
    }

    console.log(`[registerGameParticipant] Checking for user account with address: ${normalizedUserAddress}`);
    let userAccount = await prisma.userAccount.findUnique({
      where: { address: normalizedUserAddress },
    });

    if (!userAccount) {
      console.log(`[registerGameParticipant] User account not found, creating new account for address: ${normalizedUserAddress}`);
      try {
        userAccount = await prisma.userAccount.create({
          data: {
            address: normalizedUserAddress,
          },
        });
        console.log(`[registerGameParticipant] User account created successfully with ID: ${userAccount.id}`);
      } catch (createError: any) {
        if (createError?.code === 'P2002' && createError?.meta?.target?.includes('address')) {
          console.log(`[registerGameParticipant] User was created by another request, fetching existing user...`);
          userAccount = await prisma.userAccount.findUnique({
            where: { address: normalizedUserAddress },
          });
          if (!userAccount) {
            throw createError;
          }
          console.log(`[registerGameParticipant] User account found after race condition with ID: ${userAccount.id}`);
        } else {
          console.error(`[registerGameParticipant] Error creating user account:`, createError);
          if (createError instanceof Error) {
            console.error(`[registerGameParticipant] Error message: ${createError.message}`);
            console.error(`[registerGameParticipant] Error stack: ${createError.stack}`);
          }
          throw createError;
        }
      }
    } else {
      console.log(`[registerGameParticipant] User account already exists with ID: ${userAccount.id}`);
    }

    const existingParticipant = await prisma.gameParticipant.findUnique({
      where: {
        gameId_userAddress: {
          gameId: game.id,
          userAddress: normalizedUserAddress,
        },
      },
    });

    if (existingParticipant) {
      return {
        success: true,
        participantId: existingParticipant.id,
      };
    }

    const participant = await prisma.gameParticipant.create({
      data: {
        gameId: game.id,
        userAddress: normalizedUserAddress,
        captainCoin: normalizedCaptainCoin,
        affiliate: affiliate ? affiliate.toLowerCase() : null,
      },
    });

    if (coinFeeds && coinFeeds.length > 0) {
      const normalizedFeeds = coinFeeds.map(feed => 
        ethers.utils.getAddress(feed).toLowerCase()
      );

      for (const feedAddress of normalizedFeeds) {
        let token = await prisma.gameToken.findUnique({
          where: { address: feedAddress },
        });

        if (!token) {
          console.warn(`Token with address ${feedAddress} not found in database. Skipping participant coin feed creation.`);
          continue;
        }

        await prisma.gameParticipantCoinFeed.create({
          data: {
            participantId: participant.id,
            tokenAddress: feedAddress,
          },
        });
      }
    }

    await prisma.userAccount.update({
      where: { address: normalizedUserAddress },
      data: {
        totalJoinedGames: {
          increment: 1,
        },
      },
    });

    return {
      success: true,
      participantId: participant.id,
    };
  } catch (error) {
    console.error('Error registering game participant:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);
      console.error('Error name:', error.name);
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to register participant: ${errorMessage}`,
    };
  }
}

