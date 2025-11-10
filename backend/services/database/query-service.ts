import { prisma } from '../../lib/prisma';
import type { DatabaseQueryRequest, DatabaseQueryResponse } from '../../types';

export async function queryDatabase(
  request: DatabaseQueryRequest
): Promise<DatabaseQueryResponse> {
  try {
    const { query, context } = request;

    if (!query || typeof query !== 'string') {
      return { success: false, error: 'Query is required' };
    }

    const queryLower = query.toLowerCase();

    if (queryLower.includes('token') || queryLower.includes('moneda') || queryLower.includes('coin')) {
      const where: any = { isActive: true };

      if (context?.chainId) {
        where.chainId = context.chainId;
      }

      if (queryLower.includes('symbol') || queryLower.includes('símbolo')) {
        const symbolMatch = query.match(/symbol[:\s]+(\w+)|símbolo[:\s]+(\w+)/i);
        if (symbolMatch) {
          where.symbol = { contains: symbolMatch[1] || symbolMatch[2], mode: 'insensitive' };
        }
      }

      const tokens = await prisma.gameToken.findMany({
        where,
        orderBy: { symbol: 'asc' },
        take: 200,
        select: {
          address: true,
          symbol: true,
          name: true,
          chainId: true,
          logo: true,
          isActive: true,
          currentPrice: true,
          price20m: true,
          price1h: true,
          price4h: true,
          price8h: true,
          price24h: true,
          price7d: true,
          price30d: true,
          lastPriceUpdate: true,
        },
      });

      const tokensWithPerformance = tokens.map(token => {
        const currentPrice = token.currentPrice ? parseFloat(token.currentPrice) : null;
        const price24h = token.price24h ? parseFloat(token.price24h) : null;

        let priceChange = 0;
        let priceChangePercent = 0;

        if (currentPrice && price24h) {
          priceChange = currentPrice - price24h;
          priceChangePercent = (priceChange / price24h) * 100;
        }

        return {
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          chainId: token.chainId,
          logo: token.logo,
          isActive: token.isActive,
          currentPrice: currentPrice || 0,
          historicalPrice: price24h || currentPrice || 0,
          priceChange: priceChange,
          priceChangePercent: priceChangePercent,
          lastPriceUpdate: token.lastPriceUpdate,
        };
      });

      return {
        success: true,
        data: {
          type: 'tokens',
          count: tokensWithPerformance.length,
          tokens: tokensWithPerformance,
        },
      };
    }

    if (queryLower.includes('game') || queryLower.includes('juego')) {
      const where: any = {};

      if (context?.chainId) {
        where.chainId = context.chainId;
      }

      if (queryLower.includes('waiting') || queryLower.includes('esperando')) {
        where.status = 'Waiting';
      } else if (queryLower.includes('started') || queryLower.includes('iniciado')) {
        where.status = 'Started';
      } else if (queryLower.includes('finished') || queryLower.includes('terminado')) {
        where.status = 'Finished';
      }

      if (queryLower.includes('bull')) {
        where.type = 1;
      } else if (queryLower.includes('bear')) {
        where.type = 2;
      }

      const games = await prisma.game.findMany({
        where,
        include: {
          creator: {
            select: {
              address: true,
              username: true,
            },
          },
          _count: {
            select: {
              participants: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return {
        success: true,
        data: {
          type: 'games',
          count: games.length,
          games: games.map(game => ({
            id: game.intId,
            chainId: game.chainId,
            type: game.type,
            status: game.status,
            duration: game.duration,
            numCoins: game.numCoins,
            numPlayers: game.numPlayers,
            currentPlayers: game.currentPlayers,
            entry: game.entry,
            coinToPlay: game.coinToPlay,
            creator: game.creator?.username || game.creatorAddress,
            participants: game._count.participants,
            createdAt: game.createdAt,
          })),
        },
      };
    }

    if (queryLower.includes('user') || queryLower.includes('usuario') || queryLower.includes('player') || queryLower.includes('jugador')) {
      const where: any = {};

      if (context?.userAddress) {
        where.address = context.userAddress;
      } else if (queryLower.includes('address') || queryLower.includes('dirección')) {
        const addressMatch = query.match(/0x[a-fA-F0-9]{40}/);
        if (addressMatch) {
          where.address = addressMatch[0];
        }
      }

      if (queryLower.includes('username') || queryLower.includes('nombre')) {
        const usernameMatch = query.match(/username[:\s]+(\w+)|nombre[:\s]+(\w+)/i);
        if (usernameMatch) {
          where.username = { contains: usernameMatch[1] || usernameMatch[2], mode: 'insensitive' };
        }
      }

      const users = await prisma.userAccount.findMany({
        where,
        include: {
          _count: {
            select: {
              gameParticipations: true,
              gameResults: true,
              createdGames: true,
            },
          },
        },
        orderBy: { totalWinnedGames: 'desc' },
        take: 20,
      });

      return {
        success: true,
        data: {
          type: 'users',
          count: users.length,
          users: users.map(user => ({
            address: user.address,
            username: user.username,
            totalWinnedGames: user.totalWinnedGames,
            totalJoinedGames: user.totalJoinedGames,
            totalFirstWinnedGames: user.totalFirstWinnedGames,
            totalEarned: user.totalEarned,
            totalSpent: user.totalSpent,
            earnedMinusSpent: user.earnedMinusSpent,
            participations: user._count.gameParticipations,
            results: user._count.gameResults,
            createdGames: user._count.createdGames,
          })),
        },
      };
    }

    if (queryLower.includes('ranking') || queryLower.includes('result') || queryLower.includes('resultado') || queryLower.includes('winner') || queryLower.includes('ganador')) {
      const where: any = {};

      if (queryLower.includes('first') || queryLower.includes('primero')) {
        where.position = 1;
      } else if (queryLower.includes('second') || queryLower.includes('segundo')) {
        where.position = 2;
      } else if (queryLower.includes('third') || queryLower.includes('tercero')) {
        where.position = 3;
      }

      const results = await prisma.gameResult.findMany({
        where,
        include: {
          user: {
            select: {
              address: true,
              username: true,
            },
          },
          game: {
            select: {
              intId: true,
              chainId: true,
              type: true,
            },
          },
        },
        orderBy: { calculatedAt: 'desc' },
        take: 20,
      });

      return {
        success: true,
        data: {
          type: 'results',
          count: results.length,
          results: results.map(result => ({
            gameId: result.game.gameId,
            userAddress: result.userAddress,
            username: result.user.username,
            position: result.position,
            score: result.score,
            prize: result.prize,
            calculatedAt: result.calculatedAt,
          })),
        },
      };
    }

    return {
      success: true,
      data: {
        type: 'info',
        message: 'Available query types: tokens, games, users, rankings',
        availableQueries: [
          'tokens - Get list of available game tokens',
          'games - Get list of games (can filter by status, type)',
          'users - Get user information and statistics',
          'rankings - Get game results and winners',
        ],
      },
    };
  } catch (error) {
    console.error('Error querying database:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to query database',
    };
  }
}

