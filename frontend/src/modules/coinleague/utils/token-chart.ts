import { ChainId } from '@/modules/common/constants/enums';
import { PriceFeeds } from '../constants';
import type { Coin } from '../types';

export function getTradingViewSymbol(
  tokenSymbol: string,
  chainId?: number
): string | undefined {
  if (!chainId) {
    return undefined;
  }

  const priceFeeds = PriceFeeds[chainId as ChainId];
  if (!priceFeeds) {
    return undefined;
  }

  const coin = priceFeeds.find(
    (c: Coin) => c.base?.toUpperCase() === tokenSymbol.toUpperCase()
  );

  return coin?.tv;
}

export function getTokenAddress(
  tokenSymbol: string,
  chainId?: number
): string | undefined {
  if (!chainId) {
    return undefined;
  }

  const priceFeeds = PriceFeeds[chainId as ChainId];
  if (!priceFeeds) {
    return undefined;
  }

  const coin = priceFeeds.find(
    (c: Coin) => c.base?.toUpperCase() === tokenSymbol.toUpperCase()
  );

  return coin?.address;
}

export function isTokenSymbol(text: string): boolean {
  const tokenSymbolPattern = /^[A-Z]{2,10}$/;
  return tokenSymbolPattern.test(text.trim().toUpperCase());
}

