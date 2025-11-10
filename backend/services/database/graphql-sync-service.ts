import { PrismaClient } from '@prisma/client';
import request, { ClientError } from 'graphql-request';
import { ethers } from 'ethers';
import { ChainId } from '../../constants/enums';
import { COIN_LEAGUES_FACTORY_ADDRESS_V3 } from '../../constants/coinleague';
import { config } from 'dotenv';
import { syncGameDetailsFromBlockchain } from './sync-games-service';

config();

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

const DEFAULT_GRAPHQL_ENDPOINTS: { [key: number]: string } = {
  [ChainId.Polygon]: 'https://api.studio.thegraph.com/query/1827/coinleague-polygon/version/latest',
  [ChainId.Base]: 'https://api.studio.thegraph.com/query/1827/coinleague-base/version/latest',
  [ChainId.BSC]: 'https://api.thegraph.com/subgraphs/name/joaocampos89/coinleaguebsc',
  [ChainId.Mumbai]: 'https://api.thegraph.com/subgraphs/name/joaocampos89/coinleaguemumbaiv3',
};

function getGraphEndpoint(chainId: number): string | null {
  const envVar = `GRAPHQL_ENDPOINT_${chainId}`;
  const envEndpoint = process.env[envVar];
  
  if (envEndpoint && envEndpoint.trim() !== '') {
    return envEndpoint.trim();
  }
  
  return DEFAULT_GRAPHQL_ENDPOINTS[chainId] || null;
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

function getFactoryAddress(chainId: number): string {
  if (chainId === ChainId.Polygon && COIN_LEAGUES_FACTORY_ADDRESS_V3[ChainId.Polygon]) {
    return COIN_LEAGUES_FACTORY_ADDRESS_V3[ChainId.Polygon];
  }
  if (chainId === ChainId.Base && COIN_LEAGUES_FACTORY_ADDRESS_V3[ChainId.Base]) {
    return COIN_LEAGUES_FACTORY_ADDRESS_V3[ChainId.Base];
  }
  if (chainId === ChainId.BSC && COIN_LEAGUES_FACTORY_ADDRESS_V3[ChainId.BSC]) {
    return COIN_LEAGUES_FACTORY_ADDRESS_V3[ChainId.BSC];
  }
  if (chainId === ChainId.Mumbai && COIN_LEAGUES_FACTORY_ADDRESS_V3[ChainId.Mumbai]) {
    return COIN_LEAGUES_FACTORY_ADDRESS_V3[ChainId.Mumbai];
  }
  return '';
}

async function getGameAddressFromBlockchain(
  factoryAddress: string,
  intId: number,
  chainId: number
): Promise<string | null> {
  try {
    const rpcUrl = getRpcUrl(chainId);
    if (!rpcUrl) {
      console.warn(`No RPC URL found for chainId ${chainId}`);
      return null;
    }

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    const factoryAbi = [
      'function games(uint256) external view returns (address)',
    ];

    const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, provider);
    const gameAddress = await factoryContract.games(intId);
    
    return gameAddress;
  } catch (error) {
    console.error(`Error getting game address from blockchain for game ${intId}:`, error);
    return null;
  }
}

export interface GraphQLSyncRequest {
  chainId: number;
  limit?: number;
  status?: string;
  skip?: number;
  syncAll?: boolean;
  updateExisting?: boolean;
}

export interface GraphQLSyncResponse {
  success: boolean;
  synced: number;
  updated: number;
  skipped: number;
  errors: number;
  errorsDetails?: string[];
  error?: string;
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

  const paramsString = queryVariableParams.length > 0 ? queryVariableParams.join(', ') : '';
  const receiveParamsString = queryParams.length > 0 ? queryParams.join(', ') : '';
  const whereParamsString = whereParams.length > 0 ? whereParams.join(', ') : '';

  let queryString = `query GetGames${paramsString ? `(${paramsString})` : ''} {\n`;
  queryString += `  games(where: {${whereParamsString}}${receiveParamsString ? `, ${receiveParamsString}` : ''}, orderBy: createdAt, orderDirection: desc) {\n`;
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

export async function syncAllGamesFromGraphQL(
  syncRequest: GraphQLSyncRequest
): Promise<GraphQLSyncResponse> {
  try {
    const { 
      chainId, 
      limit = 100, 
      status, 
      skip = 0, 
      syncAll = false,
      updateExisting = false 
    } = syncRequest;

    if (!chainId) {
      return { 
        success: false, 
        error: 'Chain ID is required', 
        synced: 0, 
        updated: 0,
        skipped: 0, 
        errors: 0 
      };
    }

    console.log(`[GraphQL Sync] Starting sync for chainId ${chainId}, limit: ${limit}, status: ${status}, syncAll: ${syncAll}, updateExisting: ${updateExisting}`);

    const graphEndpoint = getGraphEndpoint(chainId);
    console.log(`[GraphQL Sync] GraphQL endpoint for chainId ${chainId}: ${graphEndpoint || 'NOT FOUND'}`);
    
    if (!graphEndpoint || !graphEndpoint.startsWith('http')) {
      const errorMsg = `No valid GraphQL endpoint found for chainId ${chainId}. Set GRAPHQL_ENDPOINT_${chainId} environment variable or use default endpoint.`;
      console.error(`[GraphQL Sync] ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        synced: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
      };
    }

    const factoryAddress = getFactoryAddress(chainId);
    console.log(`[GraphQL Sync] Factory address for chainId ${chainId}: ${factoryAddress || 'NOT FOUND'}`);
    if (!factoryAddress) {
      const errorMsg = `No factory address found for chainId ${chainId}`;
      console.error(`[GraphQL Sync] ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        synced: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
      };
    }

    let totalSynced = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const allErrorsDetails: string[] = [];
    let currentSkip = skip;
    const pageSize = limit;
    let hasMore = true;

    const prisma = getPrismaClient();

    while (hasMore) {
      const variables: any = {
        first: pageSize,
        skip: currentSkip,
      };

      if (status) {
        variables.status = status;
      }

      const query = buildGamesQuery(variables);
      console.log(`[GraphQL Sync] Fetching games batch for chainId ${chainId}: skip=${currentSkip}, first=${pageSize}`);
      console.log(`[GraphQL Sync] GraphQL query: ${query.substring(0, 200)}...`);

      let response: { games: any[] };
      try {
        console.log(`[GraphQL Sync] Making GraphQL request to ${graphEndpoint}...`);
        response = await request(graphEndpoint, query, variables) as { games: any[] };
        console.log(`[GraphQL Sync] GraphQL request successful for chainId ${chainId}`);
      } catch (error) {
        console.error(`[GraphQL Sync] GraphQL request failed for chainId ${chainId}:`, error);
        if (error instanceof ClientError) {
          const errorMessage = error.response.errors?.[0]?.message || 'Unknown GraphQL error';
          const fullError = JSON.stringify(error.response, null, 2);
          console.error(`[GraphQL Sync] GraphQL error details for chainId ${chainId}:`, fullError);
          if (errorMessage.includes('removed') || errorMessage.includes('not found')) {
            console.warn(`[GraphQL Sync] GraphQL endpoint for chainId ${chainId} is not available: ${errorMessage}`);
            return {
              success: false,
              error: `GraphQL endpoint unavailable: ${errorMessage}`,
              synced: totalSynced,
              updated: totalUpdated,
              skipped: totalSkipped,
              errors: totalErrors,
              errorsDetails: allErrorsDetails,
            };
          }
        }
        throw error;
      }

      const games = response.games || [];
      console.log(`[GraphQL Sync] Found ${games.length} games in this batch for chainId ${chainId}`);

      if (games.length === 0) {
        hasMore = false;
        break;
      }

      let batchSynced = 0;
      let batchUpdated = 0;
      let batchSkipped = 0;
      let batchErrors = 0;
      const batchErrorsDetails: string[] = [];

      const validGames = games.filter(g => {
        const intId = typeof g.intId === 'string' ? parseInt(g.intId, 10) : Number(g.intId);
        return !isNaN(intId) && intId > 0;
      });

      const intIds = validGames.map(g => {
        const intId = typeof g.intId === 'string' ? parseInt(g.intId, 10) : Number(g.intId);
        return intId;
      });

      const existingGames = await prisma.game.findMany({
        where: { intId: { in: intIds } },
        select: { intId: true, address: true, creatorAddress: true },
      });
      const existingGameMap = new Map(existingGames.map(g => [g.intId, g]));

      const creatorAddressesFromDb = existingGames
        .map(g => g.creatorAddress?.toLowerCase())
        .filter((addr): addr is string => !!addr && addr !== '0x0000000000000000000000000000000000000000');
      
      const uniqueCreatorAddresses = Array.from(new Set(creatorAddressesFromDb));

      const existingCreators = uniqueCreatorAddresses.length > 0 
        ? await prisma.userAccount.findMany({
            where: { address: { in: uniqueCreatorAddresses } },
            select: { address: true },
          })
        : [];
      const existingCreatorAddresses = new Set(existingCreators.map(c => c.address));

      const zeroAddress = '0x0000000000000000000000000000000000000000';
      if (!existingCreatorAddresses.has(zeroAddress)) {
        const zeroAddressUser = await prisma.userAccount.findUnique({
          where: { address: zeroAddress },
          select: { address: true },
        });
        
        if (!zeroAddressUser) {
          try {
            await prisma.userAccount.create({
              data: { address: zeroAddress },
            });
          } catch (createError: any) {
            if (createError?.code === 'P2002' && createError?.meta?.target?.includes('address')) {
            } else if (process.env.DEBUG === 'true') {
              console.warn(`[GraphQL Sync] Error creating zero address user:`, createError);
            }
          }
        }
        existingCreatorAddresses.add(zeroAddress);
      }


      for (const graphGame of games) {
        try {
          const intId = typeof graphGame.intId === 'string' 
            ? parseInt(graphGame.intId, 10) 
            : Number(graphGame.intId);

          if (isNaN(intId) || intId <= 0) {
            if (process.env.DEBUG === 'true') {
              console.warn(`[GraphQL Sync] Invalid intId for game: ${graphGame.intId}`);
            }
            batchSkipped++;
            continue;
          }

          const existingGame = existingGameMap.get(intId);

          if (existingGame && !updateExisting) {
            batchSkipped++;
            continue;
          }

          let gameType: number;
          if (typeof graphGame.type === 'string') {
            const typeLower = graphGame.type.toLowerCase();
            gameType = typeLower === 'bull' || typeLower === '1' ? 1 : 0;
          } else if (typeof graphGame.type === 'number') {
            gameType = graphGame.type;
          } else if (typeof graphGame.type === 'bigint') {
            gameType = Number(graphGame.type);
          } else {
            gameType = 0;
          }

          let gameAddress = existingGame?.address;
          if (!gameAddress || gameAddress === '0x0000000000000000000000000000000000000000') {
            gameAddress = await getGameAddressFromBlockchain(factoryAddress, intId, chainId) || 
                         '0x0000000000000000000000000000000000000000';
          }

          const createdAtTimestamp = graphGame.createdAt 
            ? (typeof graphGame.createdAt === 'string' ? parseInt(graphGame.createdAt, 10) : Number(graphGame.createdAt))
            : Math.floor(Date.now() / 1000);

          const startTimestamp = graphGame.startsAt || graphGame.startedAt
            ? (typeof (graphGame.startsAt || graphGame.startedAt) === 'string' 
                ? parseInt(graphGame.startsAt || graphGame.startedAt, 10) 
                : Number(graphGame.startsAt || graphGame.startedAt))
            : createdAtTimestamp;

          const abortTimestamp = graphGame.abortedAt
            ? (typeof graphGame.abortedAt === 'string' ? parseInt(graphGame.abortedAt, 10) : Number(graphGame.abortedAt))
            : startTimestamp + (graphGame.duration || 0);

          const startedAt = graphGame.startedAt
            ? new Date(typeof graphGame.startedAt === 'string' ? parseInt(graphGame.startedAt, 10) * 1000 : Number(graphGame.startedAt) * 1000)
            : null;

          const endedAt = graphGame.endedAt
            ? new Date(typeof graphGame.endedAt === 'string' ? parseInt(graphGame.endedAt, 10) * 1000 : Number(graphGame.endedAt) * 1000)
            : null;

          const duration = typeof graphGame.duration === 'string' 
            ? parseInt(graphGame.duration, 10) 
            : (typeof graphGame.duration === 'number' ? graphGame.duration : 0);
          
          const numCoins = typeof graphGame.numCoins === 'string' 
            ? parseInt(graphGame.numCoins, 10) 
            : (typeof graphGame.numCoins === 'number' ? graphGame.numCoins : 2);
          
          const numPlayers = typeof graphGame.numPlayers === 'string' 
            ? parseInt(graphGame.numPlayers, 10) 
            : (typeof graphGame.numPlayers === 'number' ? graphGame.numPlayers : 2);
          
          const currentPlayers = typeof graphGame.currentPlayers === 'string' 
            ? parseInt(graphGame.currentPlayers, 10) 
            : (typeof graphGame.currentPlayers === 'number' ? graphGame.currentPlayers : 0);

          let creatorAddress = (existingGame?.creatorAddress || '0x0000000000000000000000000000000000000000').toLowerCase();
          
          if (!existingCreatorAddresses.has(creatorAddress) && creatorAddress !== '0x0000000000000000000000000000000000000000') {
            try {
              await prisma.userAccount.create({
                data: { address: creatorAddress },
              });
              existingCreatorAddresses.add(creatorAddress);
            } catch (createError: any) {
              if (createError?.code === 'P2002' && createError?.meta?.target?.includes('address')) {
                existingCreatorAddresses.add(creatorAddress);
              } else if (process.env.DEBUG === 'true') {
                console.warn(`[GraphQL Sync] Error creating creator ${creatorAddress}:`, createError);
              }
            }
          }

          const gameData = {
            intId: intId,
            chainId: chainId,
            address: gameAddress,
            type: gameType,
            status: graphGame.status || 'Waiting',
            duration: duration,
            numCoins: numCoins,
            numPlayers: numPlayers,
            currentPlayers: currentPlayers,
            entry: graphGame.entry || '0',
            coinToPlay: graphGame.coinToPlay || '0x0000000000000000000000000000000000000000',
            amountToPlay: graphGame.entry || '0',
            startTimestamp: BigInt(startTimestamp),
            abortTimestamp: BigInt(abortTimestamp),
            startedAt: startedAt,
            endedAt: endedAt,
            creatorAddress: creatorAddress,
            createdAt: new Date(createdAtTimestamp * 1000),
          };

          let game;
          if (existingGame) {
            game = await prisma.game.update({
              where: { intId },
              data: gameData,
            });
            batchUpdated++;
          } else {
            game = await prisma.game.create({
              data: gameData,
            });
            batchSynced++;
            console.log(`[GraphQL Sync] ✓ Created new game: intId=${intId}, chainId=${chainId}`);
          }

          try {
            await syncGameDetailsFromBlockchain(
              game.id,
              intId,
              factoryAddress,
              chainId,
              gameType
            );
          } catch (syncDetailsError: any) {
            console.warn(`[GraphQL Sync] ⚠ Could not sync details for game ${intId}:`, syncDetailsError?.message || String(syncDetailsError));
          }

        } catch (error: any) {
          const errorMessage = error?.message || String(error);
          console.error(`[GraphQL Sync] ✗ Error syncing game ${graphGame.intId}:`, errorMessage);
          batchErrors++;
          batchErrorsDetails.push(`Game ${graphGame.intId}: ${errorMessage}`);
        }
      }

      totalSynced += batchSynced;
      totalUpdated += batchUpdated;
      totalSkipped += batchSkipped;
      totalErrors += batchErrors;
      if (batchErrorsDetails.length > 0) {
        allErrorsDetails.push(...batchErrorsDetails);
      }

      if (batchSynced > 0 || batchUpdated > 0 || batchErrors > 0 || process.env.DEBUG === 'true') {
        console.log(`[GraphQL Sync] Batch: synced=${batchSynced}, updated=${batchUpdated}, skipped=${batchSkipped}, errors=${batchErrors}`);
      }

      if (syncAll && games.length === pageSize) {
        currentSkip += pageSize;
      } else {
        hasMore = false;
      }
    }

    console.log(`[GraphQL Sync] ✓ Completed sync for chainId ${chainId}: synced=${totalSynced}, updated=${totalUpdated}, skipped=${totalSkipped}, errors=${totalErrors}`);
    if (allErrorsDetails.length > 0) {
      console.warn(`[GraphQL Sync] Error details for chainId ${chainId}:`, allErrorsDetails.slice(0, 5));
    }

    return {
      success: true,
      synced: totalSynced,
      updated: totalUpdated,
      skipped: totalSkipped,
      errors: totalErrors,
      errorsDetails: allErrorsDetails.length > 0 ? allErrorsDetails : undefined,
    };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorStack = error?.stack || '';
    const chainId = syncRequest.chainId;
    console.error(`[GraphQL Sync] ✗ Fatal error syncing games from GraphQL for chainId ${chainId}:`, errorMessage);
    console.error(`[GraphQL Sync] Error stack:`, errorStack);
    if (error instanceof Error) {
      console.error(`[GraphQL Sync] Full error object:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }
    return {
      success: false,
      error: errorMessage,
      synced: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };
  }
}

