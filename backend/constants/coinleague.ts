import { ChainId } from './enums';

export interface CoinToPlayInterface {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

export const COIN_LEAGUES_FACTORY_ADDRESS_V3 = {
  [ChainId.Mumbai]: '0xb33f24f9ddc38725F2b791e63Fb26E6CEc5e842A',
  [ChainId.Polygon]: '0x43fB5D9d4Dcd6D71d668dc6f12fFf97F35C0Bd7E',
  [ChainId.BSC]: '',
  [ChainId.Base]: '0x34C21825ef6Bfbf69cb8748B4587f88342da7aFb',
};

export const CoinToPlay: { [key in ChainId]?: CoinToPlayInterface[] } = {
  [ChainId.Mumbai]: [
    {
      address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      name: 'Matic',
      symbol: 'Matic',
      decimals: 18,
    },
    {
      address: '0xd3FC7D494ce25303BF8BeC111310629429e6cDEA',
      name: 'Tether',
      symbol: 'USDT',
      decimals: 6,
    },
  ],
  [ChainId.BSC]: [
    {
      address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      name: 'Binance Coin',
      symbol: 'BNB',
      decimals: 18,
    },
    {
      address: '0x55d398326f99059fF775485246999027B3197955',
      name: 'Tether',
      symbol: 'USDT',
      decimals: 18,
    },
  ],
  [ChainId.Polygon]: [
    {
      address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      name: 'Matic',
      symbol: 'Matic',
      decimals: 18,
    },
    {
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      name: 'Tether',
      symbol: 'USDT',
      decimals: 6,
    },
  ],
  [ChainId.Base]: [
    {
      address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      name: 'USDC',
      symbol: 'USDC',
      decimals: 6,
    },
  ],
};

export const StableCoinToPlay: { [key in ChainId]?: CoinToPlayInterface } = {
  [ChainId.Mumbai]: {
    address: '0xd3FC7D494ce25303BF8BeC111310629429e6cDEA',
    name: 'Tether',
    symbol: 'USDT',
    decimals: 6,
  },
  [ChainId.BSC]: {
    address: '0x55d398326f99059fF775485246999027B3197955',
    name: 'Tether',
    symbol: 'USDT',
    decimals: 18,
  },
  [ChainId.Polygon]: {
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    name: 'Tether',
    symbol: 'USDT',
    decimals: 6,
  },
  [ChainId.Base]: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6,
  },
};

export enum GameLevel {
  All = 0,
  Novice,
  Beginner,
  Intermediate,
  Advanced,
  Expert,
  Master,
  GrandMaster,
}

