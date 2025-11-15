import { ethers } from 'ethers';
import { ChainId } from '../constants/enums';

const RPC_CALL_DELAY = 300;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 3000;
const RATE_LIMIT_DELAY = 10000;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 60 seconds

const lastCallTimes = new Map<string, number>();
const circuitBreaker = new Map<string, number>(); // Track when endpoints are temporarily disabled

const RPC_ENDPOINTS: { [key: number]: string[] } = {
  [ChainId.Polygon]: [
    process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    'https://polygon.llamarpc.com',
    'https://rpc.ankr.com/polygon',
    'https://polygon-rpc.publicnode.com',
    'https://1rpc.io/matic',
    'https://polygon.blockpi.network/v1/rpc/public',
    'https://polygon.drpc.org',
  ],
  [ChainId.Base]: [
    process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    'https://base.llamarpc.com',
    'https://base-rpc.publicnode.com',
  ],
  [ChainId.BSC]: [
    process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
    'https://bsc-dataseed1.defibit.io',
    'https://bsc-dataseed1.ninicoin.io',
  ],
  [ChainId.BSCTest]: [
    process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
    'https://data-seed-prebsc-2-s1.binance.org:8545',
    'https://bsc-testnet.publicnode.com',
  ],
  [ChainId.Mumbai]: [
    process.env.MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
    'https://matic-mumbai.chainstacklabs.com',
  ],
};

/**
export function getRpcUrls(chainId: number): string[] {
  return RPC_ENDPOINTS[chainId] || [];
}

/**
 * Rate limit delay between RPC calls
 */
async function rateLimitDelay(rpcUrl: string): Promise<void> {
  const lastCall = lastCallTimes.get(rpcUrl) || 0;
  const now = Date.now();
  const timeSinceLastCall = now - lastCall;
  
  if (timeSinceLastCall < RPC_CALL_DELAY) {
    await new Promise(resolve => setTimeout(resolve, RPC_CALL_DELAY - timeSinceLastCall));
  }
  
  lastCallTimes.set(rpcUrl, Date.now());
}

function isEndpointDisabled(rpcUrl: string): boolean {
  const disabledUntil = circuitBreaker.get(rpcUrl);
  if (!disabledUntil) return false;
  
  if (Date.now() < disabledUntil) {
    return true;
  }
  
  circuitBreaker.delete(rpcUrl);
  return false;
}

function disableEndpoint(rpcUrl: string, duration: number = CIRCUIT_BREAKER_TIMEOUT): void {
  circuitBreaker.set(rpcUrl, Date.now() + duration);
}

function getAvailableRpcUrls(chainId: number): string[] {
  const allUrls = RPC_ENDPOINTS[chainId] || [];
  return allUrls.filter(url => !isEndpointDisabled(url));
}

function isRateLimitError(error: any): boolean {
  if (!error) return false;
  
  if (error.code === -32090) return true;
  if (error.code === 429) return true;
  if (error.error?.code === -32090) return true;
  if (error.error?.code === 429) return true;
  
  const errorMessage = error.message || error.reason || String(error);
  if (errorMessage.includes('rate limit')) return true;
  if (errorMessage.includes('too many requests')) return true;
  if (errorMessage.includes('429')) return true;
  if (errorMessage.includes('rate limit exhausted')) return true;
  if (errorMessage.includes('retry in')) return true;
  
  const errorBody = error.body || error.error?.body || '';
  if (typeof errorBody === 'string') {
    if (errorBody.includes('rate limit')) return true;
    if (errorBody.includes('too many requests')) return true;
    if (errorBody.includes('-32090')) return true;
    if (errorBody.includes('429')) return true;
  }
  
  if (error.error) {
    const nestedMessage = error.error.message || '';
    if (nestedMessage.includes('rate limit')) return true;
    if (nestedMessage.includes('too many requests')) return true;
    if (nestedMessage.includes('retry in')) return true;
  }
  
  return false;
}

function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const errorCode = error.code;
  const errorMessage = error.message || error.reason || String(error);
  
  if (errorCode === 'NETWORK_ERROR') return true;
  if (errorCode === 'SERVER_ERROR') return true;
  if (errorCode === 'TIMEOUT') return true;
  
  if (isRateLimitError(error)) return true;
  
  if (errorMessage.includes('ECONNREFUSED')) return true;
  if (errorMessage.includes('ETIMEDOUT')) return true;
  if (errorMessage.includes('ENOTFOUND')) return true;
  
  return false;
}

export async function createRpcProviderWithRetry(
  chainId: number,
  retries: number = MAX_RETRIES
): Promise<ethers.providers.JsonRpcProvider> {
  let availableUrls = getAvailableRpcUrls(chainId);
  
  if (availableUrls.length === 0) {
    console.warn(`All endpoints disabled, resetting circuit breakers and retrying...`);
    circuitBreaker.clear();
    availableUrls = RPC_ENDPOINTS[chainId] || [];
  }
  
  if (availableUrls.length === 0) {
    throw new Error(`No RPC URLs available for chainId ${chainId}`);
  }

  let lastError: any = null;
  let lastUsedUrl: string | null = null;

  for (let attempt = 0; attempt < availableUrls.length; attempt++) {
    const rpcUrl = availableUrls[attempt];
    
    try {
      await rateLimitDelay(rpcUrl);
      
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      
      await provider.getNetwork();
      
      lastUsedUrl = rpcUrl;
      return provider;
    } catch (error: any) {
      lastError = error;
      
      if (isRateLimitError(error)) {
        console.warn(`Rate limit detected on ${rpcUrl}, disabling endpoint for ${CIRCUIT_BREAKER_TIMEOUT}ms...`);
        disableEndpoint(rpcUrl, CIRCUIT_BREAKER_TIMEOUT);
        
        availableUrls = getAvailableRpcUrls(chainId);
        if (availableUrls.length === 0) {
          console.warn(`All endpoints rate limited, resetting circuit breakers...`);
          circuitBreaker.clear();
          availableUrls = RPC_ENDPOINTS[chainId] || [];
        }
        
        if (attempt < availableUrls.length - 1) {
          console.warn(`Trying next available endpoint... (${availableUrls.length} available)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        } else {
          console.warn(`All endpoints rate limited, waiting ${RATE_LIMIT_DELAY}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
          circuitBreaker.clear();
          availableUrls = RPC_ENDPOINTS[chainId] || [];
          attempt = -1;
          continue;
        }
      }
      
      if (!isRetryableError(error)) {
        throw error;
      }
      
      if (attempt < availableUrls.length - 1) {
        console.warn(`RPC error on ${rpcUrl}, trying next endpoint...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
    }
  }

  throw lastError || new Error(`Failed to connect to any RPC endpoint for chainId ${chainId}`);
}

export async function callWithRetry<T = any>(
  callFn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY_BASE
): Promise<T> {
  let lastError: any = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await callFn();
    } catch (error: any) {
      lastError = error;
      
      if (isRateLimitError(error)) {
        if (attempt < retries - 1) {
          const waitTime = RATE_LIMIT_DELAY * (attempt + 1);
          console.warn(`Rate limit detected (attempt ${attempt + 1}/${retries}), waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      if (!isRetryableError(error)) {
        throw error;
      }
      
      if (attempt < retries - 1) {
        const waitTime = delay * Math.pow(2, attempt);
        console.warn(`RPC call failed (attempt ${attempt + 1}/${retries}), retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
    }
  }

  throw lastError || new Error('RPC call failed after retries');
}

export async function createContractWithRetry(
  chainId: number,
  address: string,
  abi: ethers.ContractInterface
): Promise<ethers.Contract> {
  const provider = await createRpcProviderWithRetry(chainId);
  return new ethers.Contract(address, abi, provider);
}

export async function callContractWithProviderRetry<T = any>(
  chainId: number,
  address: string,
  abi: ethers.ContractInterface,
  methodName: string,
  args: any[],
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: any = null;
  let contract: ethers.Contract | null = null;
  let consecutiveRateLimits = 0;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (!contract || (attempt > 0 && isRateLimitError(lastError))) {
        if (contract && attempt > 0) {
          const waitTime = Math.min(RATE_LIMIT_DELAY * (consecutiveRateLimits + 1), 30000);
          console.warn(`Rate limit detected, waiting ${waitTime}ms and recreating contract with new provider (attempt ${attempt + 1}/${retries})...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        contract = await createContractWithRetry(chainId, address, abi);
        consecutiveRateLimits = 0;
      }

      const result = await (contract as any)[methodName](...args);
      consecutiveRateLimits = 0;
      return result;
    } catch (error: any) {
      lastError = error;
      
      if (isRateLimitError(error)) {
        consecutiveRateLimits++;
        contract = null;
        if (attempt < retries - 1) {
          const waitTime = Math.min(RATE_LIMIT_DELAY * consecutiveRateLimits, 30000);
          console.warn(`Rate limit detected (attempt ${attempt + 1}/${retries}, consecutive: ${consecutiveRateLimits}), waiting ${waitTime}ms and recreating provider...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      } else {
        consecutiveRateLimits = 0;
      }
      
      if (!isRetryableError(error)) {
        throw error;
      }
      
      if (attempt < retries - 1) {
        const waitTime = RETRY_DELAY_BASE * Math.pow(2, attempt);
        console.warn(`Contract call failed (attempt ${attempt + 1}/${retries}), retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
    }
  }

  throw lastError || new Error('Contract call failed after retries');
}

