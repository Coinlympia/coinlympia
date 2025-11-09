// Frontend types for chat components
// These types are shared between frontend components and should match backend/types/index.ts

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
  isParticipating?: boolean;
}

export interface MessageOption {
  id: string;
  label: string;
  value: string | number | boolean;
  checked?: boolean;
  disabled?: boolean;
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
  availableGames?: AvailableGame[];
  isConfirmationMessage?: boolean;
  gameJoinState?: {
    gameId?: number;
    chainId?: number;
    maxCoins?: number;
    captainCoin?: string;
    selectedCoins?: string[];
  };
  options?: MessageOption[];
  onOptionChange?: (optionId: string, checked: boolean) => void;
}

