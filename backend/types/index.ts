export interface ChatRequest {
  message: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  tokenData?: {
    tokens: Array<{
      address: string;
      symbol: string;
      name: string;
      priceChange: number;
      priceChangePercent: number;
      currentPrice: number;
      historicalPrice: number;
    }>;
    timePeriod: string;
    chainId?: number;
  };
  chainId?: number;
  gameCreationState?: {
    gameType?: 'bull' | 'bear';
    duration?: number;
    gameLevel?: number;
    maxCoins?: number;
    maxPlayers?: number;
    startDate?: number;
    selectedCoins?: string[];
  };
}

export interface ChatResponse {
  response: string;
  action?: {
    type: 'create_game' | 'ask_question';
    gameParams?: {
      gameType: 'bull' | 'bear';
      duration: number;
      gameLevel: number;
      maxCoins: number;
      maxPlayers: number;
      startDate: number;
      selectedCoins?: string[];
    };
    missingParams?: string[];
  };
  tokenPerformanceData?: {
    tokens: Array<{
      address: string;
      symbol: string;
      name: string;
      priceChange: number;
      priceChangePercent: number;
      currentPrice: number;
      historicalPrice: number;
    }>;
    timePeriod: string;
  };
}

export interface GameParams {
  gameType?: 'bull' | 'bear';
  duration?: number;
  gameLevel?: number;
  maxCoins?: number;
  maxPlayers?: number;
}

export interface DatabaseQueryRequest {
  query: string;
  context?: {
    chainId?: number;
    userAddress?: string;
  };
}

export interface DatabaseQueryResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface TokenAnalysisRequest {
  text: string;
  chainId: number;
}

export interface TokenPerformance {
  address: string;
  symbol: string;
  name: string;
  priceChange: number;
  priceChangePercent: number;
  currentPrice: number;
  historicalPrice: number;
}

