import request from 'graphql-request';
import type { AvailableGame, FindGamesRequest, FindGamesResponse } from '../../types';

const GET_GRAPHQL_CLIENT_URL_MAIN_ROOM: { [key: number]: string } = {
  137: 'https://api.studio.thegraph.com/query/1827/coinleague-polygon/version/latest',
  8453: 'https://api.studio.thegraph.com/query/1827/coinleague-base/version/latest',
  56: 'https://api.thegraph.com/subgraphs/name/joaocampos89/coinleaguebsc',
  80001: 'https://api.thegraph.com/subgraphs/name/joaocampos89/coinleaguemumbaiv3',
};

function getGraphEndpoint(chainId?: number): string {
  if (chainId && GET_GRAPHQL_CLIENT_URL_MAIN_ROOM[chainId]) {
    return GET_GRAPHQL_CLIENT_URL_MAIN_ROOM[chainId];
  }
  return GET_GRAPHQL_CLIENT_URL_MAIN_ROOM[137];
}

function buildGamesQuery(variables: any): string {
  let queryVariableParams: string[] = [];
  let queryParams: string[] = [];
  let whereParams: string[] = [];

  if (variables.skip !== undefined) {
    queryVariableParams.push('$skip: Int');
    queryParams.push('skip: $skip');
  }

  if (variables.first !== undefined) {
    queryVariableParams.push('$first: Int');
    queryParams.push('first: $first');
  }

  if (variables.status) {
    queryVariableParams.push('$status: String!');
    whereParams.push('status: $status');
  }

  if (variables.duration !== undefined) {
    queryVariableParams.push('$duration: Int');
    whereParams.push('duration: $duration');
  }

  if (variables.numPlayers !== undefined) {
    queryVariableParams.push('$numPlayers: BigInt!');
    whereParams.push('numPlayers: $numPlayers');
  }

  if (variables.type !== undefined) {
    queryVariableParams.push('$type: BigInt!');
    whereParams.push('type: $type');
    if (typeof variables.type === 'number') {
      variables.type = variables.type.toString();
    }
  }

  if (variables.orderDirection) {
    queryVariableParams.push('$orderDirection: String');
    queryParams.push('orderDirection: $orderDirection');
  }

  if (variables.orderBy) {
    queryVariableParams.push('$orderBy: String');
    queryParams.push('orderBy: $orderBy');
  }

  if (variables.entry) {
    queryVariableParams.push('$entry: String');
    whereParams.push('entry: $entry');
  }

  const paramsString = queryVariableParams.length > 0 ? queryVariableParams.join(', ') : '';
  const receiveParamsString = queryParams.length > 0 ? queryParams.join(', ') : '';
  const whereParamsString = whereParams.length > 0 ? whereParams.join(', ') : '';

  let queryString = `query GetGames${paramsString ? `(${paramsString})` : ''} {\n`;
  queryString += `  games(where: {${whereParamsString}}${receiveParamsString ? `, ${receiveParamsString}` : ''}) {\n`;
  queryString += `    id\n`;
  queryString += `    intId\n`;
  queryString += `    type\n`;
  queryString += `    duration\n`;
  queryString += `    status\n`;
  queryString += `    numCoins\n`;
  queryString += `    numPlayers\n`;
  queryString += `    currentPlayers\n`;
  queryString += `    entry\n`;
  queryString += `    createdAt\n`;
  queryString += `    startedAt\n`;
  queryString += `    startsAt\n`;
  queryString += `    abortedAt\n`;
  queryString += `    coinToPlay\n`;
  queryString += `    endedAt\n`;
  queryString += `  }\n`;
  queryString += `}`;

  return queryString;
}

export async function findAvailableGames(
  findGamesRequest: FindGamesRequest
): Promise<FindGamesResponse> {
  try {
    const { gameType, maxEntry, minEntry, chainId, status, limit = 20, userAddress } = findGamesRequest;

    console.log('Find games request:', { gameType, maxEntry, minEntry, chainId, status, limit });

    const graphEndpoint = getGraphEndpoint(chainId);
    console.log('Using GraphQL endpoint:', graphEndpoint);

    const variables: any = {
      first: limit * 2,
      orderBy: 'createdAt',
      orderDirection: 'desc',
    };

    if (status) {
      variables.status = status;
    } else {
      variables.status = 'Waiting';
    }

    const query = buildGamesQuery(variables);
    console.log('GraphQL query:', query);
    console.log('GraphQL variables:', variables);

    const response = await request(graphEndpoint, query, variables) as { games: any[] };
    const games = response.games || [];

    console.log(`Found ${games.length} games from GraphQL`);
    
    if (games.length > 0) {
      console.log('Sample games type values:', games.slice(0, 3).map(g => ({ intId: g.intId, type: g.type, typeOf: typeof g.type })));
    }

    let availableGames = games.filter(game => game.currentPlayers < game.numPlayers);
    console.log(`After filtering full games: ${availableGames.length} games`);

    if (gameType) {
      const expectedTypeString = gameType === 'bull' ? 'Bull' : 'Bear';
      const expectedTypeNumber = gameType === 'bull' ? 1 : 2;
      
      console.log(`Filtering for game type: ${gameType} (expecting: "${expectedTypeString}" or ${expectedTypeNumber})`);
      
      const beforeFilter = availableGames.length;
      availableGames = availableGames.filter(game => {
        let matches = false;
        
        if (typeof game.type === 'string') {
          const gameTypeLower = game.type.toLowerCase();
          const expectedLower = expectedTypeString.toLowerCase();
          matches = gameTypeLower === expectedLower;
        } else if (typeof game.type === 'bigint') {
          matches = Number(game.type) === expectedTypeNumber;
        } else if (typeof game.type === 'number') {
          matches = game.type === expectedTypeNumber;
        } else {
          const gameTypeStr = String(game.type).toLowerCase();
          const expectedLower = expectedTypeString.toLowerCase();
          matches = gameTypeStr === expectedLower;
        }
        
        if (!matches) {
          console.log(`Game ${game.intId} filtered out: expected "${expectedTypeString}" or ${expectedTypeNumber}, got ${game.type} (typeof: ${typeof game.type})`);
        }
        return matches;
      });
      
      console.log(`After filtering by game type (${gameType}): ${availableGames.length} games (filtered out ${beforeFilter - availableGames.length} games)`);
      
      if (availableGames.length > 0) {
        console.log('Remaining games types:', availableGames.slice(0, 5).map(g => ({ intId: g.intId, type: g.type, typeOf: typeof g.type })));
      }
    }

    if (minEntry || maxEntry) {
      availableGames = availableGames.filter(game => {
        try {
          const entryNumber = BigInt(game.entry);
          const minEntryBigInt = minEntry ? BigInt(minEntry) : null;
          const maxEntryBigInt = maxEntry ? BigInt(maxEntry) : null;

          if (minEntryBigInt && entryNumber < minEntryBigInt) {
            return false;
          }
          if (maxEntryBigInt && entryNumber > maxEntryBigInt) {
            return false;
          }
          return true;
        } catch (error) {
          console.error('Error filtering by entry amount:', error, { gameEntry: game.entry, minEntry, maxEntry });
          return true;
        }
      });
      console.log(`After filtering by entry amount: ${availableGames.length} games`);
    }

    const participatedIntIds = new Set<number>();
    
    if (userAddress) {
      try {
        const { prisma } = await import('../../../frontend/src/lib/prisma');
        
        const gameIntIds = availableGames.map(g => {
          const intId = typeof g.intId === 'string' ? parseInt(g.intId, 10) : Number(g.intId);
          return isNaN(intId) ? null : intId;
        }).filter((id): id is number => id !== null);
        
        if (gameIntIds.length > 0) {
          const gamesInDb = await prisma.game.findMany({
            where: {
              intId: { in: gameIntIds },
              ...(chainId ? { chainId } : {}),
            },
            select: {
              id: true,
              intId: true,
              participants: {
                where: {
                  userAddress: userAddress.toLowerCase(),
                },
                select: {
                  id: true,
                },
              },
            },
          });
          
          gamesInDb
            .filter(game => game.participants.length > 0)
            .forEach(game => {
              participatedIntIds.add(game.intId);
            });
          
          const beforeUserFilter = availableGames.length;
          availableGames = availableGames.filter(game => {
            const gameIntId = typeof game.intId === 'string' ? parseInt(game.intId, 10) : Number(game.intId);
            return !participatedIntIds.has(gameIntId);
          });
          
          console.log(`After filtering user participations: ${availableGames.length} games (filtered out ${beforeUserFilter - availableGames.length} games)`);
          console.log(`Participated intIds:`, Array.from(participatedIntIds));
        }
      } catch (error) {
        console.error('Error filtering user participations:', error);
      }
    }

    availableGames = availableGames.slice(0, limit);

    const formattedGames: AvailableGame[] = availableGames.map(game => {
      let gameType: 'bull' | 'bear';
      let typeName: string;
      
      if (typeof game.type === 'string') {
        const typeLower = game.type.toLowerCase();
        gameType = typeLower === 'bull' ? 'bull' : 'bear';
        typeName = game.type;
      } else if (typeof game.type === 'number') {
        gameType = game.type === 1 ? 'bull' : 'bear';
        typeName = game.type === 1 ? 'Bull' : 'Bear';
      } else if (typeof game.type === 'bigint') {
        const typeNum = Number(game.type);
        gameType = typeNum === 1 ? 'bull' : 'bear';
        typeName = typeNum === 1 ? 'Bull' : 'Bear';
      } else {
        const typeStr = String(game.type).toLowerCase();
        gameType = typeStr === 'bull' || typeStr === '1' ? 'bull' : 'bear';
        typeName = gameType === 'bull' ? 'Bull' : 'Bear';
      }
      
      const gameIntId = typeof game.intId === 'string' ? parseInt(game.intId, 10) : Number(game.intId);
      const isParticipating = participatedIntIds.has(gameIntId);
      
      return {
      id: game.intId,
      chainId: chainId || 137,
      type: gameType,
      typeName: typeName,
      status: game.status,
      duration: game.duration,
      durationFormatted: formatDuration(game.duration),
      numCoins: game.numCoins,
      numPlayers: game.numPlayers,
      currentPlayers: game.currentPlayers,
      availableSlots: game.numPlayers - game.currentPlayers,
      entry: game.entry,
      entryFormatted: formatEntry(game.entry),
      coinToPlay: game.coinToPlay || '0x0000000000000000000000000000000000000000',
      creator: 'Unknown',
      participants: game.currentPlayers,
      createdAt: new Date(parseInt(game.createdAt) * 1000),
      createdAtFormatted: new Date(parseInt(game.createdAt) * 1000).toISOString(),
      isParticipating: isParticipating,
      };
    });

    return {
      games: formattedGames,
      count: formattedGames.length,
      filters: {
        gameType: gameType || null,
        maxEntry: maxEntry || null,
        minEntry: minEntry || null,
        chainId: chainId || null,
        status: status || 'Waiting',
      },
    };
  } catch (error) {
    console.error('Error in findAvailableGames:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    return {
      games: [],
      count: 0,
      filters: {
        gameType: findGamesRequest?.gameType || null,
        maxEntry: findGamesRequest?.maxEntry || null,
        minEntry: findGamesRequest?.minEntry || null,
        chainId: findGamesRequest?.chainId || null,
        status: findGamesRequest?.status || 'Waiting',
      },
    };
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h`;
  }
  return `${minutes}m`;
}

function formatEntry(entry: string): string {
  try {
    const entryNumber = parseFloat(entry);
    const entryInUSDT = entryNumber / 1e6;
    return `${entryInUSDT.toFixed(2)} USDT`;
  } catch (error) {
    return `${entry} wei`;
  }
}
