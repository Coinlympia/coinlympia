import axios from 'axios';

const COINGECKO_ENDPOINT = 'https://api.coingecko.com/api/v3';
const COINGECKO_PRO_ENDPOINT = 'https://pro-api.coingecko.com/api/v3';
const COINGECKO_PLATFORM_ID: { [key: number]: string } = {
  137: 'polygon-pos',
  80001: 'polygon-pos',
  1: 'ethereum',
  56: 'binance-smart-chain',
  8453: 'base',
};

const PLATFORM_PRIORITY = ['polygon-pos', 'ethereum', 'binance-smart-chain', 'base'];

function getApiKey(): string | null {
  return process.env.COINGECKO_API_KEY || null;
}

function getEndpoint(): string {
  return getApiKey() ? COINGECKO_PRO_ENDPOINT : COINGECKO_ENDPOINT;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  const apiKey = getApiKey();
  if (apiKey) {
    headers['x-cg-pro-api-key'] = apiKey;
  }

  return headers;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

const CACHE_TTL = {
  CURRENT_PRICE: 60 * 1000, // 1 minuto para precios actuales
  HISTORICAL: 5 * 60 * 1000, // 5 minutos para datos históricos
};

function getCacheKey(type: string, ...args: string[]): string {
  return `${type}:${args.join(':')}`;
}

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCache(key: string, data: any, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key);
    }
  }
}, 60000);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const RATE_LIMIT = {
  window: 60 * 1000,
  requests: [] as number[],
};

function getMaxRequests(): number {
  return getApiKey() ? 450 : 30;
}

function checkRateLimit(): boolean {
  const now = Date.now();
  RATE_LIMIT.requests = RATE_LIMIT.requests.filter(
    (timestamp) => now - timestamp < RATE_LIMIT.window
  );

  const maxRequests = getMaxRequests();
  if (RATE_LIMIT.requests.length >= maxRequests) {
    return false;
  }

  RATE_LIMIT.requests.push(now);
  return true;
}

async function waitForRateLimit(): Promise<void> {
  while (!checkRateLimit()) {
    const oldestRequest = Math.min(...RATE_LIMIT.requests);
    const waitTime = RATE_LIMIT.window - (Date.now() - oldestRequest) + 1000;
    if (waitTime > 0) {
      await delay(waitTime);
    }
  }
}

export async function getTokenCurrentPrice(
  tokenAddress: string,
  platformId: string,
  chainId: number
): Promise<number | null> {
  const cacheKey = getCacheKey('current_price', platformId, tokenAddress.toLowerCase());
  const cached = getCached(cacheKey);
  if (cached !== null) {
    return cached;
  }

  await waitForRateLimit();

  const endpoint = getEndpoint();
  const headers = getHeaders();
  const normalizedAddress = tokenAddress.toLowerCase();
  const url = `${endpoint}/simple/token_price/${platformId}?contract_addresses=${normalizedAddress}&vs_currencies=usd`;

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers,
    });

    if (Object.keys(response.data).length === 0) {
    }

    const price = response.data[normalizedAddress]?.usd;
    if (price) {
      setCache(cacheKey, price, CACHE_TTL.CURRENT_PRICE);
      return price;
    }

    const priceVariations = [
      response.data[normalizedAddress]?.usd,
      response.data[tokenAddress.toLowerCase()]?.usd,
      response.data[tokenAddress]?.usd,
    ].find(p => p !== undefined);

    if (priceVariations) {
      setCache(cacheKey, priceVariations, CACHE_TTL.CURRENT_PRICE);
      return priceVariations;
    }

    return null;
  } catch (error: any) {
    if (error.response?.status === 429) {
      await delay(5000);
      return null;
    }

    return null;
  }
}

export async function getTokenHistoricalPrices(
  tokenAddress: string,
  platformId: string,
  days: number = 30
): Promise<[number, number][] | null> {
  const cacheKey = getCacheKey('historical', platformId, tokenAddress.toLowerCase(), days.toString());
  const cached = getCached(cacheKey);
  if (cached !== null) {
    return cached;
  }

  await waitForRateLimit();

  const endpoint = getEndpoint();
  const headers = getHeaders();
  const normalizedAddress = tokenAddress.toLowerCase();
  const url = `${endpoint}/coins/${platformId}/contract/${normalizedAddress}/market_chart?vs_currency=usd&days=${days}`;

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers,
    });

    const prices = response.data?.prices;
    if (prices && prices.length > 0) {
      setCache(cacheKey, prices, CACHE_TTL.HISTORICAL);
      return prices;
    }

    return null;
  } catch (error: any) {
    if (error.response?.status === 429) {
      await delay(5000);
      return null;
    }

    return null;
  }
}

export function getPlatformId(chainId: number): string | null {
  return COINGECKO_PLATFORM_ID[chainId] || null;
}

export async function searchTokenBySymbol(symbol: string): Promise<string | null> {
  const cacheKey = getCacheKey('token_search', symbol.toLowerCase());
  const cached = getCached(cacheKey);
  if (cached !== null) {
    return cached;
  }

  await waitForRateLimit();

  const endpoint = getEndpoint();
  const headers = getHeaders();
  const url = `${endpoint}/search?query=${encodeURIComponent(symbol)}`;

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers,
    });

    const coins = response.data?.coins || [];
    for (const coin of coins) {
      if (coin.symbol?.toLowerCase() === symbol.toLowerCase()) {
        setCache(cacheKey, coin.id, 24 * 60 * 60 * 1000);
        return coin.id;
      }
    }

    if (coins.length > 0) {
      const firstCoin = coins[0];
      setCache(cacheKey, firstCoin.id, 24 * 60 * 60 * 1000);
      return firstCoin.id;
    }

    return null;
  } catch (error: any) {
    return null;
  }
}

export async function getTokenContractAddress(
  coingeckoId: string,
  preferredPlatformId?: string
): Promise<{ address: string; platformId: string } | null> {
  const platformsToTry = preferredPlatformId
    ? [preferredPlatformId, ...PLATFORM_PRIORITY.filter(p => p !== preferredPlatformId)]
    : PLATFORM_PRIORITY;

  for (const platformId of platformsToTry) {
    const cacheKey = getCacheKey('token_contract', coingeckoId, platformId);
    const cached = getCached(cacheKey);
    if (cached !== null) {
      return { address: cached, platformId };
    }

    await waitForRateLimit();

    const endpoint = getEndpoint();
    const headers = getHeaders();
    const url = `${endpoint}/coins/${coingeckoId}`;

    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers,
        params: {
          localization: false,
          tickers: false,
          market_data: false,
          community_data: false,
          developer_data: false,
          sparkline: false,
        },
      });

      const platforms = response.data?.platforms || {};
      const contractAddress = platforms[platformId];

      if (contractAddress) {
        const normalizedAddress = contractAddress.toLowerCase();
        setCache(cacheKey, normalizedAddress, 24 * 60 * 60 * 1000);
        return { address: normalizedAddress, platformId };
      }
    } catch (error: any) {
      continue;
    }
  }

  return null;
}

export async function getNativeCoinPrice(
  coingeckoId: string
): Promise<number | null> {
  const cacheKey = getCacheKey('native_coin_price', coingeckoId);
  const cached = getCached(cacheKey);
  if (cached !== null) {
    return cached;
  }

  await waitForRateLimit();

  const endpoint = getEndpoint();
  const headers = getHeaders();
  const url = `${endpoint}/simple/price?ids=${coingeckoId}&vs_currencies=usd`;

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers,
    });

    const price = response.data?.[coingeckoId]?.usd;
    if (price) {
      setCache(cacheKey, price, CACHE_TTL.CURRENT_PRICE);
      return price;
    }

    return null;
  } catch (error: any) {
    return null;
  }
}

export async function getNativeCoinHistoricalPrices(
  coingeckoId: string,
  days: number = 30
): Promise<[number, number][] | null> {
  const cacheKey = getCacheKey('native_coin_historical', coingeckoId, days.toString());
  const cached = getCached(cacheKey);
  if (cached !== null) {
    return cached;
  }

  await waitForRateLimit();

  const endpoint = getEndpoint();
  const headers = getHeaders();
  const url = `${endpoint}/coins/${coingeckoId}/market_chart?vs_currency=usd&days=${days}`;

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers,
    });

    const prices = response.data?.prices;
    if (prices && prices.length > 0) {
      setCache(cacheKey, prices, CACHE_TTL.HISTORICAL);
      return prices;
    }

    return null;
  } catch (error: any) {
    return null;
  }
}

export async function getTokenPriceBySymbol(
  symbol: string,
  platformId: string,
  chainId: number
): Promise<number | null> {
  const coingeckoId = await searchTokenBySymbol(symbol);
  if (!coingeckoId) {
    return null;
  }

  const contractInfo = await getTokenContractAddress(coingeckoId, platformId);

  if (contractInfo) {
    return await getTokenCurrentPrice(contractInfo.address, contractInfo.platformId, chainId);
  } else {
    return await getNativeCoinPrice(coingeckoId);
  }
}

export async function getMultipleTokenPrices(
  tokenAddresses: string[],
  platformId: string
): Promise<Record<string, number>> {
  if (tokenAddresses.length === 0) return {};

  const addresses = tokenAddresses.map(addr => addr.toLowerCase()).join(',');
  const cacheKey = getCacheKey('batch_prices', platformId, addresses);
  const cached = getCached(cacheKey);
  if (cached !== null) {
    return cached;
  }

  await waitForRateLimit();

  try {
    const response = await axios.get(
      `${getEndpoint()}/simple/token_price/${platformId}?contract_addresses=${addresses}&vs_currencies=usd`,
      {
        timeout: 15000,
        headers: getHeaders(),
      }
    );

    const prices: Record<string, number> = {};
    for (const address of tokenAddresses) {
      const price = response.data[address.toLowerCase()]?.usd;
      if (price) {
        prices[address] = price;
      }
    }

    setCache(cacheKey, prices, CACHE_TTL.CURRENT_PRICE);
    return prices;
  } catch (error: any) {
    if (error.response?.status === 429) {
      await delay(5000);
      return {};
    }
    return {};
  }
}

