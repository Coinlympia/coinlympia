// Frontend types for chat components
// These types are shared between frontend components and should match backend/types/index.ts

export interface TokenPerformance {
  address: string;
  symbol: string;
  name: string;
  priceChange: number;
  priceChangePercent: number;
  currentPrice: number;
  historicalPrice: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  tokenPerformanceData?: {
    tokens: TokenPerformance[];
    timePeriod: string;
  };
}

