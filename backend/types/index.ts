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
  gameJoinState?: {
    gameId?: number;
    chainId?: number;
    maxCoins?: number;
    captainCoin?: string;
    selectedCoins?: string[];
  };
}

export interface ChatResponse {
  response: string;
  action?: {
    type: 'create_game' | 'ask_question' | 'find_games' | 'join_existing_game';
    gameParams?: {
      gameType: 'bull' | 'bear';
      duration: number;
      gameLevel: number;
      maxCoins: number;
      maxPlayers: number;
      startDate: number;
      selectedCoins?: string[];
    };
    findGamesParams?: {
      gameType?: 'bull' | 'bear';
      maxEntry?: string;
      minEntry?: string;
      chainId?: number;
      status?: 'Waiting' | 'Started' | 'Finished';
      limit?: number;
    };
    joinGameParams?: {
      gameId: number;
      chainId: number;
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
  selectedCoins?: string[];
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
  logo?: string | null;
  priceChange: number;
  priceChangePercent: number;
  currentPrice: number;
  historicalPrice: number;
}

export interface JoinGameRequest {
  gameId: string | number;
  selectedCoins: string[];
  chainId: number;
  maxCoins: number;
  affiliate?: string;
}

export interface JoinGameResponse {
  gameId: string;
  gameIdNumber: number;
  captainCoin: string;
  feeds: string[];
  validatedCoins: string[];
  chainId: number;
}

export interface FindGamesRequest {
  gameType?: 'bull' | 'bear';
  maxEntry?: string;
  minEntry?: string;
  chainId?: number;
  status?: 'Waiting' | 'Started' | 'Finished';
  limit?: number;
  userAddress?: string;
}

export interface AvailableGame {
  id: number;
  chainId: number;
  type: 'bull' | 'bear';
  typeName: string;
  status: string;
  duration: number;
  durationFormatted: string;
  numCoins: number;
  numPlayers: number;
  currentPlayers: number;
  availableSlots: number;
  entry: string;
  entryFormatted: string;
  coinToPlay: string;
  creator: string;
  participants: number;
  createdAt: Date;
  createdAtFormatted: string;
}

export interface FindGamesResponse {
  games: AvailableGame[];
  count: number;
  filters: {
    gameType: 'bull' | 'bear' | null;
    maxEntry: string | null;
    minEntry: string | null;
    chainId: number | null;
    status: string;
  };
}

