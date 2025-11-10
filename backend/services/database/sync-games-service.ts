import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { ChainId } from '../../constants/enums';

let prismaInstance: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set!');
    }
    
    const dbUrl = process.env.DATABASE_URL;
    const isAccelerate = dbUrl.startsWith('prisma://') || 
                         dbUrl.startsWith('prisma+postgres://') || 
                         dbUrl.startsWith('prisma+postgresql://');
    
    if (isAccelerate) {
      try {
        const { withAccelerate } = require('@prisma/extension-accelerate');
        prismaInstance = new PrismaClient({
          log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        }).$extends(withAccelerate()) as unknown as PrismaClient;
      } catch (error) {
        prismaInstance = new PrismaClient({
          log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        });
      }
    } else {
      prismaInstance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      });
    }
  }
  return prismaInstance;
}

function getRpcUrl(chainId: number): string | null {
  const rpcUrls: { [key: number]: string } = {
    [ChainId.Polygon]: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    [ChainId.Base]: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    [ChainId.BSC]: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
    [ChainId.Mumbai]: process.env.MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
  };
  return rpcUrls[chainId] || null;
}

export async function syncGameDetailsFromBlockchain(
  gameId: string,
  intId: number,
  factoryAddress: string,
  chainId: number,
  gameType: number
): Promise<void> {
  const rpcUrl = getRpcUrl(chainId);
  if (!rpcUrl || !factoryAddress) {
    throw new Error(`Missing RPC URL or factory address for chainId ${chainId}`);
  }

  const factoryAbi = [
    'function games(uint256) external view returns (uint256 id, uint8 game_type, bool started, bool scores_done, bool finished, bool aborted, uint256 num_coins, uint256 num_players, uint256 duration, uint256 start_timestamp, uint256 abort_timestamp, uint256 amount_to_play, uint256 total_amount_collected, address coin_to_play)',
    'function getPlayers(uint256 id) external view returns (tuple(address[] coin_feeds, address player_address, address captain_coin, int256 score, address affiliate)[] players)',
    'function playerCoinFeeds(uint256 index, uint256 id) external view returns (address[] feeds)',
    'function coins(uint256 id, address coin_feed) external view returns (address coin_feed, int256 start_price, int256 end_price, int256 score)',
  ];

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, provider);
  const prisma = getPrismaClient();

  try {
    const gameData = await factoryContract.games(intId);
    
    const started = gameData.started;
    const finished = gameData.finished;
    const scoresDone = gameData.scores_done;
    
    const startTimestamp = gameData.start_timestamp.toNumber();
    const abortTimestamp = gameData.abort_timestamp.toNumber();
    const startedAt = started ? new Date(startTimestamp * 1000) : null;
    const endedAt = finished ? new Date(abortTimestamp * 1000) : null;
    
    let status = 'Waiting';
    if (finished) {
      status = 'Ended';
    } else if (started) {
      status = 'Started';
    }

    const players = await factoryContract.getPlayers(intId);
    const currentPlayersCount = players.length;

    await prisma.game.update({
      where: { id: gameId },
      data: {
        startedAt,
        endedAt,
        status,
        totalAmountCollected: gameData.total_amount_collected.toString(),
        currentPlayers: currentPlayersCount,
      },
    });

    const allCoinFeeds: Map<string, { startPrice: string; endPrice: string | null; score: string | null }> = new Map();

    const playerAddresses = players.map((p: any) => ethers.utils.getAddress(p.player_address).toLowerCase());
    const existingUsers = await prisma.userAccount.findMany({
      where: { address: { in: playerAddresses } },
      select: { address: true },
    });
    const existingAddresses = new Set(existingUsers.map(u => u.address));
    const newAddresses = playerAddresses.filter((addr: string) => !existingAddresses.has(addr));

    if (newAddresses.length > 0) {
      try {
        await prisma.userAccount.createMany({
          data: newAddresses.map((address: string) => ({ address })),
          skipDuplicates: true,
        });
      } catch (error) {
        if (process.env.DEBUG === 'true') {
          console.warn('Error creating users in batch:', error);
        }
      }
    }

    const participantData: Array<{
      gameId: string;
      userAddress: string;
      captainCoin: string;
      affiliate: string | null;
      index: number;
      coinFeeds: string[];
    }> = [];

    for (let index = 0; index < players.length; index++) {
      const player = players[index];
      const playerAddress = ethers.utils.getAddress(player.player_address).toLowerCase();
      const captainCoin = ethers.utils.getAddress(player.captain_coin);
      const affiliate = player.affiliate ? ethers.utils.getAddress(player.affiliate) : null;
      
      const playerCoinFeeds = await factoryContract.playerCoinFeeds(index, intId);
      const normalizedFeeds = playerCoinFeeds.map((feed: string) => ethers.utils.getAddress(feed));

      participantData.push({
        gameId,
        userAddress: playerAddress,
        captainCoin,
        affiliate: affiliate || null,
        index,
        coinFeeds: normalizedFeeds,
      });

      if (!allCoinFeeds.has(captainCoin)) {
        try {
          const coinData = await factoryContract.coins(intId, captainCoin);
          allCoinFeeds.set(captainCoin, {
            startPrice: coinData.start_price.toString(),
            endPrice: coinData.end_price.toString() !== '0' ? coinData.end_price.toString() : null,
            score: coinData.score.toString() !== '0' ? coinData.score.toString() : null,
          });
        } catch (error) {
          if (process.env.DEBUG === 'true') {
            console.warn(`Could not get coin data for ${captainCoin}:`, error);
          }
        }
      }

      for (const feedAddress of normalizedFeeds) {
        if (!allCoinFeeds.has(feedAddress)) {
          try {
            const coinData = await factoryContract.coins(intId, feedAddress);
            allCoinFeeds.set(feedAddress, {
              startPrice: coinData.start_price.toString(),
              endPrice: coinData.end_price.toString() !== '0' ? coinData.end_price.toString() : null,
              score: coinData.score.toString() !== '0' ? coinData.score.toString() : null,
            });
          } catch (error) {
            if (process.env.DEBUG === 'true') {
              console.warn(`Could not get coin data for ${feedAddress}:`, error);
            }
          }
        }
      }
    }

    const participants = await prisma.$transaction(
      participantData.map(data =>
        prisma.gameParticipant.upsert({
          where: {
            gameId_userAddress: {
              gameId: data.gameId,
              userAddress: data.userAddress,
            },
          },
          create: {
            gameId: data.gameId,
            userAddress: data.userAddress,
            captainCoin: data.captainCoin,
            affiliate: data.affiliate,
            championId: null,
          },
          update: {
            captainCoin: data.captainCoin,
            affiliate: data.affiliate,
          },
        })
      )
    );

    const participantCoinFeedsToCreate: Array<{
      participantId: string;
      tokenAddress: string;
    }> = [];

    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      const data = participantData[i];
      for (const feedAddress of data.coinFeeds) {
        participantCoinFeedsToCreate.push({
          participantId: participant.id,
          tokenAddress: feedAddress,
        });
      }
    }

    if (participantCoinFeedsToCreate.length > 0) {
      await prisma.gameParticipantCoinFeed.createMany({
        data: participantCoinFeedsToCreate,
        skipDuplicates: true,
      });
    }

    const tokenAddresses = Array.from(allCoinFeeds.keys());
    const existingTokens = await prisma.gameToken.findMany({
      where: { address: { in: tokenAddresses } },
      select: { address: true },
    });
    const existingTokenAddresses = new Set(existingTokens.map(t => t.address));
    const newTokenAddresses = tokenAddresses.filter(addr => !existingTokenAddresses.has(addr));

    if (newTokenAddresses.length > 0) {
      try {
        await prisma.gameToken.createMany({
          data: newTokenAddresses.map(address => ({
            address,
            symbol: 'UNKNOWN',
            name: 'Unknown Token',
            base: 'USD',
            baseName: 'US Dollar',
            chainId,
            isActive: true,
          })),
          skipDuplicates: true,
        });
      } catch (error) {
        if (process.env.DEBUG === 'true') {
          console.warn('Error creating tokens in batch:', error);
        }
      }
    }

    const coinFeedUpserts = Array.from(allCoinFeeds.entries()).map(([tokenAddress, coinData]) =>
      prisma.gameCoinFeed.upsert({
        where: {
          gameId_tokenAddress: {
            gameId,
            tokenAddress,
          },
        },
        create: {
          gameId,
          tokenAddress,
          startPrice: coinData.startPrice,
          endPrice: coinData.endPrice,
          score: coinData.score,
        },
        update: {
          startPrice: coinData.startPrice,
          endPrice: coinData.endPrice,
          score: coinData.score,
        },
      })
    );

    if (coinFeedUpserts.length > 0) {
      await prisma.$transaction(coinFeedUpserts);
    }

    if (finished && scoresDone && players.length > 0) {
      const sortedPlayers = [...players].sort((a, b) => {
        const scoreA = a.score.toNumber();
        const scoreB = b.score.toNumber();
        if (gameType === 0) {
          return scoreA - scoreB;
        } else {
          return scoreB - scoreA;
        }
      });

      const totalPrize = gameData.total_amount_collected.toString();
      const prizeAmount = ethers.BigNumber.from(totalPrize);
      
      if (sortedPlayers.length > 0) {
        const winner = sortedPlayers[0];
        const winnerAddress = ethers.utils.getAddress(winner.player_address).toLowerCase();

        let prize = '0';
        if (sortedPlayers.length > 3) {
          const partPrize = prizeAmount.mul(8).div(10);
          prize = partPrize.mul(6).div(10).toString();
        } else {
          prize = prizeAmount.mul(8).div(10).toString();
        }

        let winnerAccount = await prisma.userAccount.findUnique({
          where: { address: winnerAddress },
        });
        
        if (!winnerAccount) {
          try {
            winnerAccount = await prisma.userAccount.create({
              data: { address: winnerAddress },
            });
          } catch (createError: any) {
            if (createError?.code === 'P2002' && createError?.meta?.target?.includes('address')) {
              winnerAccount = await prisma.userAccount.findUnique({
                where: { address: winnerAddress },
              });
              if (!winnerAccount) {
                throw createError;
              }
            } else {
              throw createError;
            }
          }
        }

        await prisma.gameResult.upsert({
          where: { gameId },
          create: {
            gameId,
            userAddress: winnerAddress,
            position: 1,
            score: winner.score.toString(),
            prize,
            captainCoin: ethers.utils.getAddress(winner.captain_coin),
            championId: null,
          },
          update: {
            userAddress: winnerAddress,
            position: 1,
            score: winner.score.toString(),
            prize,
            captainCoin: ethers.utils.getAddress(winner.captain_coin),
          },
        });
      }
    }
  } catch (error) {
    console.error(`[Sync Details] ✗ Error syncing game details for game ${intId}:`, error);
    throw error;
  }
}
