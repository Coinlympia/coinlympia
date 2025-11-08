import { ethers } from 'ethers';
import type { JoinGameRequest, JoinGameResponse } from '../../types';

export async function prepareJoinGame(
  request: JoinGameRequest
): Promise<JoinGameResponse> {
  const { gameId, selectedCoins, chainId, maxCoins } = request;

  if (!gameId) {
    throw new Error('Game ID is required');
  }

  if (!selectedCoins || selectedCoins.length === 0) {
    throw new Error('Selected coins are required');
  }

  if (!chainId) {
    throw new Error('Chain ID is required');
  }

  if (!maxCoins || maxCoins < 2) {
    throw new Error('Max coins must be at least 2');
  }

  if (selectedCoins.length !== maxCoins) {
    throw new Error(
      `Number of selected coins (${selectedCoins.length}) does not match game configuration (expected ${maxCoins} coins)`
    );
  }

  const validatedCoins: string[] = [];
  for (const coin of selectedCoins) {
    if (!coin || typeof coin !== 'string') {
      throw new Error(`Invalid coin address: ${coin}`);
    }

    if (!coin.startsWith('0x') || coin.length !== 42) {
      throw new Error(`Invalid address format: ${coin}. Expected 0x-prefixed 42-character address`);
    }

    try {
      const checksummedAddress = ethers.utils.getAddress(coin);
      validatedCoins.push(checksummedAddress);
    } catch (error) {
      throw new Error(`Invalid address: ${coin}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const captainCoin = validatedCoins[0];
  const feeds = validatedCoins.slice(1);

  if (!captainCoin || captainCoin.length !== 42 || !captainCoin.startsWith('0x')) {
    throw new Error(`Invalid captain coin address: ${captainCoin}`);
  }

  if (feeds.length === 0) {
    throw new Error('At least one coin feed is required (maxCoins must be at least 2)');
  }

  const expectedFeedsCount = maxCoins - 1;
  if (feeds.length !== expectedFeedsCount) {
    throw new Error(
      `Number of feeds (${feeds.length}) does not match game configuration (expected ${expectedFeedsCount} feeds for ${maxCoins} coins)`
    );
  }

  for (const feed of feeds) {
    if (!feed || feed.length !== 42 || !feed.startsWith('0x')) {
      throw new Error(`Invalid feed address: ${feed}`);
    }
  }

  const gameIdString = typeof gameId === 'number' ? gameId.toString() : gameId;
  const gameIdNumber = parseInt(gameIdString, 10);
  
  if (isNaN(gameIdNumber) || gameIdNumber <= 0) {
    throw new Error(`Invalid game ID: ${gameIdString}`);
  }

  return {
    gameId: gameIdString,
    gameIdNumber,
    captainCoin,
    feeds,
    validatedCoins,
    chainId,
  };
}
