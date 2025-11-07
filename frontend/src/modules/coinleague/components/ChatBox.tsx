import { AnimatedTextField } from '@/components/animated/AnimatedTextField';
import { GameLevel, GameType } from '@/modules/coinleague/constants/enums';
import { AppDialogTitle } from '@/modules/common/components/AppDialogTitle';
import { getNetworkSlugFromChainId } from '@/modules/common/utils';
import { useWeb3React } from '@dexkit/wallet-connectors/hooks/useWeb3React';
import SendIcon from '@mui/icons-material/Send';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  Box,
  Dialog,
  DialogContent,
  DialogProps,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
  useTheme
} from '@mui/material';
import { getAddress } from 'ethers/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useCoinToPlayStable, useCreateGameMutation, useCreateGameServerMutation, useTotalGamesMutation } from '../hooks/coinleague';
import { useFactoryAddress } from '../hooks/coinleagueFactory';
import { joinGame } from '../services/coinLeagueFactoryV3';
import { GET_GAME_LEVEL_AMOUNTS } from '../utils/game';
import { Message, TokenPerformance } from '../types/chat';

interface ChatBoxProps {
  dialogProps: DialogProps;
  initialMessage?: string;
  initialData?: {
    tokens: TokenPerformance[];
    timePeriod: string;
  };
  chainId?: number;
  availableTokens?: Array<{
    address: string;
    symbol: string;
    name: string;
  }>;
  onGameParamsExtracted: (params: {
    gameType?: GameType;
    duration?: number;
    gameLevel?: GameLevel;
    maxCoins?: number;
    maxPlayers?: number;
  }) => void;
}

export function ChatBox({
  dialogProps,
  initialMessage,
  initialData,
  chainId,
  availableTokens,
  onGameParamsExtracted,
}: ChatBoxProps) {
  const { onClose } = dialogProps;
  const theme = useTheme();
  const { formatMessage } = useIntl();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [typingMessage, setTypingMessage] = useState<{ id: string; content: string } | null>(null);
  const [hasGeneratedInitialResponse, setHasGeneratedInitialResponse] = useState(false);
  const initialDataRef = useRef(initialData);
  const [gameCreationState, setGameCreationState] = useState<{
    gameType?: 'bull' | 'bear';
    duration?: number;
    gameLevel?: number;
    maxCoins?: number;
    maxPlayers?: number;
    startDate?: number;
    selectedCoins?: string[];
  }>({});
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const router = useRouter();
  const { provider, chainId: accountChainId, signer, account } = useWeb3React();
  const factoryAddress = useFactoryAddress();
  const coinToPlay = useCoinToPlayStable(chainId || accountChainId);

  const createGameMutation = useCreateGameMutation({
    factoryAddress,
    provider,
    signer,
    onHash: () => { },
  });

  const totalGamesMutation = useTotalGamesMutation({
    factoryAddress,
    provider,
  });

  const createGameServerMutation = useCreateGameServerMutation();

  // Function to get token addresses from symbols or addresses
  const getTokenAddressesFromSymbols = async (symbolsOrAddresses: string[], chainId: number): Promise<{ captainCoin: string; coinFeeds: string[] } | null> => {
    try {
      console.log('Processing tokens (symbols or addresses):', symbolsOrAddresses, 'chainId:', chainId);

      // Separate addresses from symbols
      const addresses: string[] = [];
      const symbols: string[] = [];

      for (const item of symbolsOrAddresses) {
        // Check if it's already an address (starts with 0x and has valid length)
        if (item.startsWith('0x') && item.length === 42) {
          console.log(`Item is already an address: ${item}`);
          addresses.push(item);
        } else {
          console.log(`Item is a symbol: ${item}`);
          symbols.push(item);
        }
      }

      // If all items are already addresses, use them directly
      if (symbols.length === 0 && addresses.length === symbolsOrAddresses.length) {
        console.log('All items are addresses, using them directly');
        const captainCoin = addresses[0];
        const coinFeeds = addresses.slice(1);
        console.log('Token addresses (direct):', { captainCoin, coinFeeds });
        return { captainCoin, coinFeeds };
      }

      // If we have symbols to resolve, fetch from database
      if (symbols.length > 0) {
        console.log('Fetching token addresses for symbols:', symbols);
        const response = await fetch('/api/query-database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'Get tokens by symbols',
            context: { chainId },
          }),
        });

        if (!response.ok) {
          console.error('Failed to fetch tokens from database, status:', response.status);
          return null;
        }

        const data = await response.json();
        console.log('Database response:', { tokenCount: data.tokens?.length, hasTokens: !!data.tokens });

        if (!data.tokens || !Array.isArray(data.tokens)) {
          console.error('No tokens found in database response, data:', data);
          return null;
        }

        // Map symbols to addresses
        for (const symbol of symbols) {
          const token = data.tokens.find((t: any) =>
            t.symbol.toLowerCase() === symbol.toLowerCase() ||
            t.name.toLowerCase() === symbol.toLowerCase()
          );

          if (token && token.address) {
            console.log(`Found token ${symbol}: ${token.address}`);
            addresses.push(token.address);
          } else {
            console.error(`Token not found for symbol: ${symbol}. Available tokens:`, data.tokens.map((t: any) => t.symbol));
            return null;
          }
        }
      }

      if (addresses.length === 0) {
        console.error('No token addresses found');
        return null;
      }

      // First token is captain, rest are coin feeds
      const captainCoin = addresses[0];
      const coinFeeds = addresses.slice(1);

      console.log('Token addresses mapped:', { captainCoin, coinFeeds });

      return { captainCoin, coinFeeds };
    } catch (error) {
      console.error('Error getting token addresses from symbols:', error);
      return null;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only auto-scroll if user is not manually scrolling
    if (!isUserScrolling) {
    scrollToBottom();
    }
  }, [messages, isUserScrolling]);

  // Detect user scrolling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      setIsUserScrolling(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsUserScrolling(false);
      }, 1000); // Reset after 1 second of no scrolling
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Update ref when initialData changes
  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  useEffect(() => {
    if (initialMessage && !hasGeneratedInitialResponse) {
      // Add initial user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: initialMessage,
        timestamp: new Date(),
      };
      setMessages([userMessage]);

      // Si tenemos initialData, usarlo directamente; si no, intentar obtenerlo
      if (initialData && initialData.tokens && initialData.tokens.length > 0) {
        // Usar los datos iniciales directamente
        setHasGeneratedInitialResponse(true);
        generateAIResponse(initialMessage, initialData);
      } else {
        // Intentar obtener datos de análisis si no los tenemos
        setHasGeneratedInitialResponse(true);
        generateAIResponse(initialMessage);
      }
    }
  }, [initialMessage, hasGeneratedInitialResponse]);

  // Si initialData llega después de que ya generamos la respuesta, regenerar
  useEffect(() => {
    if (initialMessage && hasGeneratedInitialResponse && initialData && initialData.tokens && initialData.tokens.length > 0) {
      // Verificar si ya tenemos un mensaje del asistente
      const hasAssistantMessage = messages.some(m => m.role === 'assistant');

      // Si no hay mensaje del asistente o el último mensaje es muy corto (probablemente "dame un momento")
      const lastMessage = messages[messages.length - 1];
      const isPlaceholderMessage = lastMessage?.role === 'assistant' &&
        (lastMessage.content.length < 100 ||
          lastMessage.content.toLowerCase().includes('momento') ||
          lastMessage.content.toLowerCase().includes('obteniendo') ||
          lastMessage.content.toLowerCase().includes('dame'));

      if (!hasAssistantMessage || isPlaceholderMessage) {
        console.log('Regenerating response with token data that arrived late');
        // Remover el mensaje placeholder si existe
        if (isPlaceholderMessage) {
          setMessages(prev => prev.filter(m => m.id !== lastMessage.id));
        }
        // Regenerar la respuesta con los datos
        generateAIResponse(initialMessage, initialData);
      }
    }
  }, [initialData, initialMessage, hasGeneratedInitialResponse, messages]);

  const generateAIResponse = async (userMessage: string, tokenData?: { tokens: TokenPerformance[]; timePeriod: string }) => {
    setIsLoading(true);
    try {
      // Always try to get token analysis if we have chainId and user is asking about tokens
      // Tokens are now fetched from database in the API, not from availableTokens prop
      if (chainId) {
        // Check if user is in the middle of creating a game
        // This includes checking gameCreationState and conversation history
        const hasGameCreationContext = 
          gameCreationState?.gameType ||
          gameCreationState?.duration ||
          gameCreationState?.gameLevel !== undefined ||
          messages.some(m => 
            m.role === 'assistant' && (
              m.content.toLowerCase().includes('crear') ||
              m.content.toLowerCase().includes('create') ||
              m.content.toLowerCase().includes('juego') ||
              m.content.toLowerCase().includes('game') ||
              m.content.toLowerCase().includes('duración') ||
              m.content.toLowerCase().includes('duration') ||
              m.content.toLowerCase().includes('nivel') ||
              m.content.toLowerCase().includes('level') ||
              m.content.toLowerCase().includes('dificultad') ||
              m.content.toLowerCase().includes('difficulty')
            )
          ) ||
          messages.some(m => 
            m.role === 'user' && (
              m.content.toLowerCase().includes('crea') ||
              m.content.toLowerCase().includes('create') ||
              (m.content.toLowerCase().includes('bear') && m.content.toLowerCase().includes('juego')) ||
              (m.content.toLowerCase().includes('bull') && m.content.toLowerCase().includes('juego'))
            )
          );

        // Check if user is asking about token performance (but not during game creation)
        const isTokenQuery =
          !hasGameCreationContext &&
          (userMessage.toLowerCase().includes('token') ||
          userMessage.toLowerCase().includes('moneda') ||
          userMessage.toLowerCase().includes('coin') ||
          userMessage.toLowerCase().includes('desempeño') ||
          userMessage.toLowerCase().includes('performance') ||
          userMessage.toLowerCase().includes('mejor') ||
          userMessage.toLowerCase().includes('best') ||
          userMessage.toLowerCase().includes('peor') ||
          userMessage.toLowerCase().includes('worst') ||
          (userMessage.toLowerCase().includes('semana') && 
           !userMessage.toLowerCase().includes('juego') && 
           !userMessage.toLowerCase().includes('game')) ||
          (userMessage.toLowerCase().includes('week') && 
           !userMessage.toLowerCase().includes('juego') && 
           !userMessage.toLowerCase().includes('game')) ||
          (userMessage.toLowerCase().includes('día') && 
           !userMessage.toLowerCase().includes('juego') && 
           !userMessage.toLowerCase().includes('game')) ||
          (userMessage.toLowerCase().includes('day') && 
           !userMessage.toLowerCase().includes('juego') && 
           !userMessage.toLowerCase().includes('game')));

        // If we don't have tokenData and user is asking about tokens, fetch it
        if (!tokenData && isTokenQuery) {
          try {
            const analysisResponse = await fetch('/api/analyze-tokens', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: userMessage,
                chainId: chainId,
              }),
            });

            if (analysisResponse.ok) {
              const analysisData = await analysisResponse.json();
              if (analysisData.tokens && analysisData.tokens.length > 0) {
                // Use the new token data for the response
                tokenData = analysisData;
              }
            }
          } catch (error) {
            // Continue without token data if fetch fails
            console.error('Error fetching token analysis:', error);
          }
        }
      }

      // Log token data for debugging
      if (tokenData && tokenData.tokens && tokenData.tokens.length > 0) {
        console.log('Sending token data to API:', {
          tokenCount: tokenData.tokens.length,
          timePeriod: tokenData.timePeriod,
          topTokens: tokenData.tokens.slice(0, 3).map(t => ({ symbol: t.symbol, percent: t.priceChangePercent }))
        });
      } else {
        console.log('No token data available for API call');
      }

      // Extract parameters from the conversation BEFORE calling the AI
      // This ensures the AI knows what information we already have
      let updatedGameCreationState = { ...gameCreationState };
      try {
        // Build conversation context for parameter extraction
        const conversationText = messages
          .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n') + `\nUser: ${userMessage}`;

        const parseResponse = await fetch('/api/parse-game-request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: conversationText }),
        });

        if (parseResponse.ok) {
          const parsedParams = await parseResponse.json();
          updatedGameCreationState = {
            ...updatedGameCreationState,
            ...(parsedParams.gameType && { gameType: parsedParams.gameType }),
            ...(parsedParams.duration && { duration: parsedParams.duration }),
            ...(parsedParams.gameLevel !== undefined && { gameLevel: parsedParams.gameLevel }),
            ...(parsedParams.maxCoins && { maxCoins: parsedParams.maxCoins }),
            ...(parsedParams.maxPlayers && { maxPlayers: parsedParams.maxPlayers }),
            // Set default startDate if not set
            ...(updatedGameCreationState.startDate === undefined && { startDate: Date.now() }),
          };

          // Update state immediately so it's available for the AI
          setGameCreationState(updatedGameCreationState);
        }
      } catch (error) {
        console.error('Error parsing game parameters:', error);
      }

      const response = await fetch('/api/chat-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          tokenData: tokenData,
          chainId: chainId,
          gameCreationState: updatedGameCreationState,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      // Check if the AI wants to create a game
      if (data.action && data.action.type === 'create_game' && data.action.gameParams) {
        await handleCreateGame(data.action.gameParams);
        return;
      }

      const messageId = `assistant-${Date.now()}`;
      const fullContent = data.response;

      // Store token performance data with the message if available
      const tokenDataForMessage = data.tokenPerformanceData && data.tokenPerformanceData.tokens
        ? data.tokenPerformanceData
        : undefined;

      // Create message with typing effect
      const assistantMessage: Message = {
        id: messageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isTyping: true,
        tokenPerformanceData: tokenDataForMessage,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setTypingMessage({ id: messageId, content: fullContent });

      // Typewriter effect
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        if (currentIndex < fullContent.length) {
          currentIndex += 2; // Adjust speed: higher = faster
          const partialContent = fullContent.substring(0, currentIndex);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, content: partialContent, isTyping: true, tokenPerformanceData: tokenDataForMessage }
                : msg
            )
          );
          scrollToBottom();
        } else {
          clearInterval(typingInterval);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, content: fullContent, isTyping: false, tokenPerformanceData: tokenDataForMessage }
                : msg
            )
          );
          setTypingMessage(null);
        }
      }, 20); // Adjust delay: lower = faster
    } catch (error) {
      console.error('Error generating AI response:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: formatMessage({
          id: 'chat.error.message',
          defaultMessage: 'Sorry, I encountered an error. Please try again.',
        }),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGame = async (gameParams: {
    gameType: 'bull' | 'bear';
    duration: number;
    gameLevel: number;
    maxCoins: number;
    maxPlayers: number;
    startDate: number;
    selectedCoins?: string[];
  }) => {
    if (!provider || !factoryAddress || !signer || !chainId || !coinToPlay) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: formatMessage({
          id: 'chat.error.wallet',
          defaultMessage: 'Please connect your wallet to create the game.',
        }),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    setIsCreatingGame(true);
    try {
      // Get token addresses BEFORE creating the game
      let tokenAddresses: { captainCoin: string; coinFeeds: string[] } | null = null;
      if (gameParams.selectedCoins && gameParams.selectedCoins.length > 0) {
        console.log('Getting token addresses BEFORE creating game...');
        const finalChainId = chainId || accountChainId;
        if (!finalChainId) {
          throw new Error('ChainId is not available');
        }
        tokenAddresses = await getTokenAddressesFromSymbols(gameParams.selectedCoins, finalChainId);

        if (!tokenAddresses) {
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: formatMessage({
              id: 'chat.error.token.addresses',
              defaultMessage: `Could not find token addresses for selected coins: ${gameParams.selectedCoins.join(', ')}. Please try again with different coins.`,
            }),
      timestamp: new Date(),
    };
          setMessages((prev) => [...prev, errorMessage]);
          setIsCreatingGame(false);
          return;
        }

        console.log('Token addresses obtained successfully:', tokenAddresses);
      }
      // Validate coinToPlay exists
      if (!coinToPlay || !coinToPlay.address) {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: formatMessage({
            id: 'chat.error.coinToPlay',
            defaultMessage: 'Coin to play is not available. Please check your network connection.',
          }),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsCreatingGame(false);
        return;
      }

      // Validate chainId exists
      if (!chainId) {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: formatMessage({
            id: 'chat.error.chainId',
            defaultMessage: 'Chain ID is not available. Please check your network connection.',
          }),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsCreatingGame(false);
        return;
      }

      console.log('Calculating amountToPlay with:', {
        gameLevel: gameParams.gameLevel,
        chainId,
        coinToPlayAddress: coinToPlay.address,
        coinToPlaySymbol: coinToPlay.symbol,
        coinToPlayDecimals: coinToPlay.decimals,
      });

      let amountToPlay;
      try {
        amountToPlay = GET_GAME_LEVEL_AMOUNTS(
          gameParams.gameLevel,
          chainId,
          coinToPlay.address,
        );
        console.log('Calculated amountToPlay:', amountToPlay.toString());
      } catch (error: any) {
        console.error('Error calculating amountToPlay:', error);
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: formatMessage({
            id: 'chat.error.amountToPlay',
            defaultMessage: `Error calculating amount to play: ${error.message || 'Unknown error'}. Please check your network connection and try again.`,
          }),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsCreatingGame(false);
        return;
      }

      // Validate amountToPlay is valid and not zero
      if (!amountToPlay || amountToPlay.isZero()) {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: formatMessage({
            id: 'chat.error.amountToPlay',
            defaultMessage: 'Invalid amount to play. Please try again with a different game level.',
          }),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsCreatingGame(false);
        return;
      }

      // Map gameType: 'bear' = 1, 'bull' = 0
      const gameTypeValue = gameParams.gameType === 'bear' ? 1 : 0;

      // Ensure startDate is in the future (at least 1 minute from now)
      const currentTime = Date.now();
      const minFutureTime = currentTime + 60000; // 1 minute buffer
      const finalStartDate = gameParams.startDate < minFutureTime ? minFutureTime : gameParams.startDate;

      console.log('Creating game with params:', {
        gameType: gameParams.gameType,
        gameTypeValue,
        duration: gameParams.duration,
        gameLevel: gameParams.gameLevel,
        maxCoins: gameParams.maxCoins,
        maxPlayers: gameParams.maxPlayers,
        selectedCoins: gameParams.selectedCoins,
        originalStartDate: gameParams.startDate,
        finalStartDate,
        amountToPlay: amountToPlay.toString(),
        coinToPlayAddress: coinToPlay.address,
        startTimestamp: Math.floor(finalStartDate / 1000),
        abortTimestamp: Math.floor(finalStartDate / 1000) + gameParams.duration,
      });

      // Valid durations that the smart contract accepts (in seconds)
      const validDurations = [
        3600,    // 1 hour
        14400,   // 4 hours
        28800,   // 8 hours
        86400,   // 24 hours
        604800,  // 1 week
      ];

      // Validate all parameters before creating the game
      if (!amountToPlay || amountToPlay.isZero()) {
        throw new Error('Invalid amount to play');
      }
      if (!coinToPlay?.address) {
        throw new Error('Coin to play address is required');
      }
      if (gameParams.duration <= 0) {
        throw new Error('Duration must be greater than 0');
      }
      if (!validDurations.includes(gameParams.duration)) {
        throw new Error(`Duration ${gameParams.duration} is not supported. Valid durations are: 1 hour (3600), 4 hours (14400), 8 hours (28800), 24 hours (86400), or 1 week (604800)`);
      }
      if (gameParams.maxCoins < 2) {
        throw new Error('Number of coins must be at least 2');
      }
      if (gameParams.maxPlayers < 2) {
        throw new Error('Number of players must be at least 2');
      }

      // Show message that game is being created
      const creatingMessage: Message = {
        id: `creating-${Date.now()}`,
        role: 'assistant',
        content: formatMessage({
          id: 'chat.game.creating',
          defaultMessage: 'Creating game on blockchain... Please confirm the transaction in your wallet.',
        }),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, creatingMessage]);

      // Create game on blockchain
      console.log('Starting game creation on blockchain with validated params:', {
        type: gameTypeValue,
        duration: gameParams.duration,
        isNFT: false,
        numCoins: gameParams.maxCoins,
        numPlayers: gameParams.maxPlayers,
        amountUnit: amountToPlay.toString(),
        coin_to_play: coinToPlay.address,
        startTimestamp: Math.floor(finalStartDate / 1000),
        abortTimestamp: Math.floor(finalStartDate / 1000) + gameParams.duration,
      });

      let createGameReceipt;
      let gameId;

      try {
        createGameReceipt = await createGameMutation.mutateAsync({
          type: gameTypeValue,
          duration: gameParams.duration,
          isNFT: false,
          numCoins: gameParams.maxCoins,
          numPlayers: gameParams.maxPlayers,
          amountUnit: amountToPlay,
          coin_to_play: coinToPlay.address,
          startTimestamp: Math.floor(finalStartDate / 1000),
          abortTimestamp: Math.floor(finalStartDate / 1000) + gameParams.duration,
        });

        // Verify the receipt is valid and the transaction succeeded
        if (!createGameReceipt) {
          throw new Error('Transaction receipt is null - transaction may have failed');
        }

        console.log('Game creation transaction receipt received:', {
          transactionHash: createGameReceipt.transactionHash,
          status: createGameReceipt.status,
          blockNumber: createGameReceipt.blockNumber,
          confirmations: createGameReceipt.confirmations,
        });

        // Verify transaction status (1 = success, 0 = failure)
        if (createGameReceipt.status !== 1) {
          throw new Error(`Transaction failed with status ${createGameReceipt.status}. Transaction hash: ${createGameReceipt.transactionHash}`);
        }

        // Verify transaction hash is valid
        if (!createGameReceipt.transactionHash || createGameReceipt.transactionHash.length !== 66) {
          throw new Error(`Invalid transaction hash: ${createGameReceipt.transactionHash}`);
        }

        console.log('Game creation transaction confirmed successfully:', createGameReceipt.transactionHash);

        // Wait for blockchain to fully process the game creation
        console.log('Waiting for blockchain to process game creation...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Get game ID and verify it's valid
        console.log('Getting game ID from blockchain...');
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
          gameId = await totalGamesMutation.mutateAsync();
          const gameIdNumber = gameId?.toNumber();
          console.log(`Attempt ${attempts + 1}: Game ID from blockchain:`, gameIdNumber);

          if (gameId && !gameId.isZero() && gameIdNumber > 0) {
            console.log('Valid game ID obtained:', gameIdNumber);
            break;
          }

          attempts++;
          if (attempts < maxAttempts) {
            console.log(`Game ID not yet available, waiting... (attempt ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        if (!gameId || gameId.isZero()) {
          throw new Error('Failed to get valid game ID from blockchain after multiple attempts - game may not have been created');
        }

        console.log('Game created successfully on blockchain. Game ID:', gameId.toNumber());
      } catch (createError: any) {
        console.error('Error creating game on blockchain:', createError);
        console.error('Error details:', {
          message: createError.message,
          code: createError.code,
          data: createError.data,
          reason: createError.reason,
          stack: createError.stack,
        });

        // Check if it's a revert error
        if (createError.reason || createError.message?.includes('Panic') || createError.message?.includes('revert')) {
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: formatMessage({
              id: 'chat.error.create.game.blockchain',
              defaultMessage: `Error creating game on blockchain: ${createError.reason || createError.message || 'Transaction failed'}. Please check the parameters and try again.`,
            }),
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          setIsCreatingGame(false);
          return;
        }

        // Re-throw if it's not a revert error
        throw createError;
      }

      // Create game on server
      console.log('Creating game on server with:', {
        id: gameId?.toNumber(),
        chainId: chainId,
        startGame: finalStartDate,
        abortGame: Math.floor(finalStartDate / 1000) + gameParams.duration,
        duration: gameParams.duration,
        type: gameTypeValue,
        amountToPlay: amountToPlay.toString(),
        coinToPlay: coinToPlay.address,
      });

      // Create game on server - this is critical for the game to appear in the UI
      console.log('Creating game on server...');
      try {
        await createGameServerMutation.mutateAsync({
          id: gameId?.toNumber() as number,
          chainId: chainId,
          startGame: finalStartDate,
          abortGame: Math.floor(finalStartDate / 1000) + gameParams.duration,
          duration: gameParams.duration,
          type: gameTypeValue,
          amountToPlay: amountToPlay.toString(),
          coinToPlay: coinToPlay.address,
        });
        console.log('Game created successfully on server');

        // Wait a moment for the server to fully process the game creation
        await new Promise(resolve => setTimeout(resolve, 8000));
      } catch (serverError: any) {
        console.error('Error creating game on server:', serverError);
        // Log the error but continue - the game is already on blockchain
        // The user can still join manually if needed
        const serverErrorMessage: Message = {
          id: `server-error-${Date.now()}`,
          role: 'assistant',
          content: formatMessage({
            id: 'chat.game.server.error',
            defaultMessage: `Game created on blockchain, but there was an error creating it on the server. You may need to refresh the page to see it.`,
          }),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, serverErrorMessage]);
      }

      // Show message that game was created successfully
      const gameCreatedMessage: Message = {
        id: `game-created-${Date.now()}`,
        role: 'assistant',
        content: formatMessage({
          id: 'chat.game.created.onchain',
          defaultMessage: `Game #${gameId.toNumber()} created successfully! Now joining the game...`,
        }, { gameId: gameId.toNumber() }),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, gameCreatedMessage]);

      // Wait a bit more to ensure the game is fully processed on the blockchain
      console.log('Waiting before joining game to ensure game is fully processed...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Join the game automatically after creating it
      console.log('Checking conditions for auto-join:', {
        hasTokenAddresses: !!tokenAddresses,
        hasSelectedCoins: !!gameParams.selectedCoins && gameParams.selectedCoins.length > 0,
        selectedCoins: gameParams.selectedCoins,
        hasGameId: !!gameId,
        gameId: gameId?.toNumber(),
        hasProvider: !!provider,
        hasSigner: !!signer,
        hasFactoryAddress: !!factoryAddress,
      });

      if (tokenAddresses && gameId && provider && signer && factoryAddress) {
        console.log('Joining game automatically with token addresses:', tokenAddresses);
        try {
          // Show message that we're joining the game
          const joiningMessage: Message = {
            id: `joining-${Date.now()}`,
            role: 'assistant',
            content: formatMessage({
              id: 'chat.game.joining',
              defaultMessage: 'Joining the game... Please confirm the transaction in your wallet.',
            }),
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, joiningMessage]);

          // Validate token addresses
          if (!tokenAddresses.captainCoin || tokenAddresses.captainCoin.length !== 42 || !tokenAddresses.captainCoin.startsWith('0x')) {
            throw new Error(`Invalid captain coin address: ${tokenAddresses.captainCoin}`);
          }

          if (!tokenAddresses.coinFeeds || tokenAddresses.coinFeeds.length === 0) {
            throw new Error('At least one coin feed is required to join the game');
          }

          // Validate all feed addresses
          for (const feed of tokenAddresses.coinFeeds) {
            if (!feed || feed.length !== 42 || !feed.startsWith('0x')) {
              throw new Error(`Invalid coin feed address: ${feed}`);
            }
          }

          // Ensure feeds array is valid (should include all tokens except captain)
          // If we have 2 coins total, feeds should have 1 (the second one)
          const feedsForJoin = [...tokenAddresses.coinFeeds]; // Use coinFeeds directly

          // Validate that the number of feeds matches the game configuration
          // maxCoins includes the captain coin, so feeds should be maxCoins - 1
          const expectedFeedsCount = gameParams.maxCoins - 1;
          if (feedsForJoin.length !== expectedFeedsCount) {
            throw new Error(`Number of feeds (${feedsForJoin.length}) does not match game configuration (expected ${expectedFeedsCount} feeds for ${gameParams.maxCoins} coins)`);
          }

          console.log('Calling joinGame with params:', {
            factoryAddress,
            feeds: feedsForJoin,
            captainCoin: tokenAddresses.captainCoin,
            gameId: gameId.toNumber(),
            gameIdString: gameId.toNumber().toString(),
            feedsLength: feedsForJoin.length,
            expectedFeedsCount,
            maxCoins: gameParams.maxCoins,
            captainCoinLength: tokenAddresses.captainCoin.length,
            allFeedsValid: feedsForJoin.every(f => f && f.length === 42 && f.startsWith('0x')),
            captainCoinValid: tokenAddresses.captainCoin && tokenAddresses.captainCoin.length === 42 && tokenAddresses.captainCoin.startsWith('0x'),
          });

          // Validate that we have at least one feed
          if (feedsForJoin.length === 0) {
            throw new Error('At least one coin feed is required to join the game');
          }

          console.log('About to call joinGame with validated params...');

          // Convert gameId to string as expected by the smart contract
          const gameIdString = gameId.toNumber().toString();

          // Ensure all addresses are checksummed (proper case) using ethers
          const checksummedCaptainCoin = getAddress(tokenAddresses.captainCoin);
          const checksummedFeeds = feedsForJoin.map(feed => getAddress(feed));

          console.log('Final joinGame params:', {
            factoryAddress,
            feeds: checksummedFeeds,
            captainCoin: checksummedCaptainCoin,
            gameId: gameIdString,
            gameIdNumber: gameId.toNumber(),
            affiliate: undefined,
            feedsCount: checksummedFeeds.length,
            captainCoinAddress: checksummedCaptainCoin,
            allAddressesValid: [
              ...checksummedFeeds,
              checksummedCaptainCoin
            ].every(addr => addr && addr.length === 42 && addr.startsWith('0x')),
            feedsArray: checksummedFeeds,
            captainCoinValue: checksummedCaptainCoin,
          });

          // Use default affiliate if none provided
          const affiliateAddress = undefined; // Will use COINLEAGUE_DEFAULT_AFFILIATE in joinGame function

          // Try to call joinGame with proper error handling
          let joinTx;
          try {
            joinTx = await joinGame({
              factoryAddress,
              feeds: checksummedFeeds,
              captainCoin: checksummedCaptainCoin,
              provider: provider,
              signer: signer,
              id: gameIdString,
              affiliate: affiliateAddress, // Will default to COINLEAGUE_DEFAULT_AFFILIATE
            });
          } catch (joinError: any) {
            console.error('Error calling joinGame:', joinError);
            console.error('Error details:', {
              message: joinError.message,
              code: joinError.code,
              data: joinError.data,
              reason: joinError.reason,
              error: joinError.error,
            });

            // Check if it's a revert error with more details
            if (joinError.reason || joinError.message?.includes('Panic')) {
              throw new Error(`Failed to join game: ${joinError.reason || joinError.message || 'Unknown error'}. Please check that the game exists and the token addresses are valid.`);
            }
            throw joinError;
          }

          console.log('Join game transaction hash:', joinTx.hash);

          // Wait for transaction to be mined and confirmed
          console.log('Waiting for join transaction to be confirmed...');
          const joinReceipt = await joinTx.wait();

          // Verify the join receipt is valid and the transaction succeeded
          if (!joinReceipt) {
            throw new Error('Join transaction receipt is null - transaction may have failed');
          }

          console.log('Join game transaction receipt received:', {
            transactionHash: joinReceipt.transactionHash,
            status: joinReceipt.status,
            blockNumber: joinReceipt.blockNumber,
            confirmations: joinReceipt.confirmations,
          });

          // Verify transaction status (1 = success, 0 = failure)
          if (joinReceipt.status !== 1) {
            throw new Error(`Join transaction failed with status ${joinReceipt.status}. Transaction hash: ${joinReceipt.transactionHash}`);
          }

          // Verify transaction hash is valid
          if (!joinReceipt.transactionHash || joinReceipt.transactionHash.length !== 66) {
            throw new Error(`Invalid join transaction hash: ${joinReceipt.transactionHash}`);
          }

          console.log('Join game transaction confirmed successfully:', joinReceipt.transactionHash);

          // Wait a bit more to ensure the server has processed the join
          console.log('Waiting for server to process join...');
          await new Promise(resolve => setTimeout(resolve, 8000));

          const joinSuccessMessage: Message = {
            id: `join-success-${Date.now()}`,
            role: 'assistant',
            content: formatMessage({
              id: 'chat.game.joined',
              defaultMessage: `Successfully joined game #${gameId.toNumber()}! Redirecting to game...`,
            }, { gameId: gameId.toNumber() }),
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, joinSuccessMessage]);

          // Navigate to game page after successful join
          const finalChainIdForNav = chainId || accountChainId;
          const networkSlug = getNetworkSlugFromChainId(finalChainIdForNav);

          if (!networkSlug) {
            console.error('Network slug not found for chainId:', finalChainIdForNav);
            const errorMessage: Message = {
              id: `error-${Date.now()}`,
              role: 'assistant',
              content: formatMessage({
                id: 'chat.error.network',
                defaultMessage: `Game created and joined successfully, but could not determine network. Please navigate manually to game #${gameId.toNumber()}.`,
              }, { gameId: gameId.toNumber() }),
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
            setIsCreatingGame(false);
            return;
          }

          // Wait a moment before redirecting to show the success message
          setTimeout(() => {
            router.push(`/game/${networkSlug}/${gameId.toNumber()}`);
          if (onClose) {
            onClose({}, 'escapeKeyDown');
          }
          }, 2000);
        } catch (joinError: any) {
          console.error('Error joining game:', joinError);
          console.error('Error details:', {
            message: joinError.message,
            code: joinError.code,
            data: joinError.data,
            stack: joinError.stack,
          });
          const joinErrorMessage: Message = {
            id: `join-error-${Date.now()}`,
            role: 'assistant',
            content: formatMessage({
              id: 'chat.error.join.game',
              defaultMessage: `Game created successfully, but there was an error joining the game: ${joinError.message || 'Unknown error'}. Please join manually from the game page.`,
            }),
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, joinErrorMessage]);

          // Don't navigate if join fails - let the user know they need to join manually
          setIsCreatingGame(false);
          return;
        }
      } else {
        console.warn('Auto-join skipped due to missing conditions:', {
          hasSelectedCoins: !!gameParams.selectedCoins && gameParams.selectedCoins.length > 0,
          hasGameId: !!gameId,
          hasProvider: !!provider,
          hasSigner: !!signer,
          hasFactoryAddress: !!factoryAddress,
        });

        // If we can't join automatically, still navigate to the game page
        if (gameId) {
          const finalChainIdForNav = chainId || accountChainId;
          const networkSlug = getNetworkSlugFromChainId(finalChainIdForNav);

          if (networkSlug) {
            const errorMessage: Message = {
              id: `error-${Date.now()}`,
              role: 'assistant',
              content: formatMessage({
                id: 'chat.game.created.manual.join',
                defaultMessage: `Game #${gameId.toNumber()} created successfully! Please join manually from the game page.`,
              }, { gameId: gameId.toNumber() }),
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);

            setTimeout(() => {
              router.push(`/game/${networkSlug}/${gameId.toNumber()}`);
              if (onClose) {
                onClose({}, 'escapeKeyDown');
              }
            }, 2000);
          }
        }
      }
    } catch (error: any) {
      console.error('Error creating game:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        data: error.data,
        stack: error.stack,
      });
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: formatMessage({
          id: 'chat.error.create.game',
          defaultMessage: `There was an error creating the game: ${error.message || 'Unknown error'}. Please try again.`,
        }),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsCreatingGame(false);
      setGameCreationState({});
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');

    // Always let the AI handle the conversation, including game creation requests
    // The AI will ask for missing information and create the game automatically when all data is collected
    await generateAIResponse(currentInput);
  };

  const handleClose = () => {
    if (onClose) {
      onClose({}, 'escapeKeyDown');
    }
  };

  // Zoom in animation variants
  const zoomInVariants = {
    hidden: {
      scale: 0.8,
      opacity: 0,
    },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        duration: 0.3,
      },
    },
    exit: {
      scale: 0.8,
      opacity: 0,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <Dialog
      {...dialogProps}
      onClose={handleClose}
      fullScreen
      PaperProps={{
        component: motion.div,
        variants: zoomInVariants,
        initial: 'hidden',
        animate: 'visible',
        exit: 'exit',
        sx: (theme) => ({
          backgroundColor: 'background.paper',
          m: 0,
          maxHeight: '100vh',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }),
      }}
      >
        <AppDialogTitle
          title={
            <FormattedMessage
              id="chat.assistant"
              defaultMessage="AI Assistant"
            />
          }
          onClose={handleClose}
        />
        <Divider />
        <DialogContent
          dividers
          sx={(theme) => ({
            p: 0,
          flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'background.paper',
          minHeight: 0,
          })}
        >
          <Box
          ref={scrollContainerRef}
            sx={(theme) => ({
              flex: 1,
              overflowY: 'auto',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              backgroundColor: 'background.paper',
            })}
          >
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <Paper
                      elevation={2}
                      sx={(theme) => ({
                        p: 2,
                        maxWidth: '80%',
                        borderRadius: 2,
                        backgroundColor:
                          message.role === 'user'
                            ? theme.palette.primary.main
                            : theme.palette.mode === 'dark'
                              ? theme.palette.grey[800]
                              : theme.palette.grey[100],
                        color:
                          message.role === 'user'
                            ? '#FFFFFF' // Siempre blanco para mensajes del usuario
                            : theme.palette.mode === 'dark'
                              ? theme.palette.text.primary // Negro o gris oscuro en modo oscuro
                              : theme.palette.text.primary, // Color normal en modo claro
                      })}
                    >
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                        {message.isTyping && (
                          <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              repeatType: 'reverse',
                            }}
                          >
                            |
                          </motion.span>
                        )}
                      </Typography>
                    </Paper>
                  </Box>
                </motion.div>
              ))}
            </AnimatePresence>
          {/* Show token performance data from messages */}
          {messages.map((msg) => {
            if (!msg.tokenPerformanceData || !msg.tokenPerformanceData.tokens || msg.tokenPerformanceData.tokens.length === 0) {
              return null;
            }

            return (
              <motion.div
                key={`token-${msg.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Paper
                  elevation={3}
                  sx={(theme) => ({
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[50],
                    border: `1px solid ${theme.palette.divider}`,
                  })}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    <FormattedMessage
                      id="available.tokens"
                      defaultMessage="Available Tokens"
                    />
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ mb: 1.5, display: 'block' }}>
                    <FormattedMessage
                      id="token.performance.last.period"
                      defaultMessage="Performance in the last {timePeriod}"
                      values={{ timePeriod: msg.tokenPerformanceData.timePeriod }}
                    />
                  </Typography>
                  <Box
                    sx={{
                      maxHeight: '300px',
                      overflowY: 'auto',
                      pr: 0.5,
                    }}
                  >
                    <Grid container spacing={1}>
                      {msg.tokenPerformanceData.tokens.map((token) => {
                        const formatPrice = (price: number) => {
                          if (price >= 1000) {
                            return new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(price);
                          }
                          return new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          }).format(price);
                        };

                        const formatPercent = (percent: number) => {
                          const sign = percent >= 0 ? '+' : '';
                          return `${sign}${percent.toFixed(2)}%`;
                        };

                        return (
                          <Grid item xs={6} sm={4} md={3} key={token.address}>
                            <Paper
                              elevation={1}
                              sx={(theme) => ({
                                p: 1,
                                borderRadius: 1.5,
                                backgroundColor: theme.palette.background.paper,
                                border: `1px solid ${theme.palette.divider}`,
                                transition: 'all 0.2s',
                                '&:hover': {
                                  borderColor: theme.palette.primary.main,
                                  boxShadow: `0 2px 8px ${theme.palette.primary.main}20`,
                                },
                              })}
                            >
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Box
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    backgroundColor: 'background.default',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                  }}
                                >
                                  <Typography variant="caption" fontWeight="bold" fontSize="0.65rem">
                                    {token.symbol.substring(0, 2).toUpperCase()}
                                  </Typography>
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="caption" fontWeight={600} noWrap sx={{ display: 'block' }}>
                                    {token.symbol}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary" fontSize="0.7rem" noWrap sx={{ display: 'block' }}>
                                    {formatPrice(token.currentPrice)}
                                  </Typography>
                                  <Stack
                                    direction="row"
                                    spacing={0.25}
                                    alignItems="center"
                                    sx={{
                                      color:
                                        token.priceChangePercent >= 0
                                          ? theme.palette.success.main
                                          : theme.palette.error.main,
                                    }}
                                  >
                                    {token.priceChangePercent >= 0 ? (
                                      <TrendingUpIcon sx={{ fontSize: 12 }} />
                                    ) : (
                                      <TrendingDownIcon sx={{ fontSize: 12 }} />
                                    )}
                                    <Typography variant="caption" fontWeight={600} fontSize="0.7rem">
                                      {formatPercent(token.priceChangePercent)}
                                    </Typography>
                                  </Stack>
                                </Box>
                              </Stack>
                            </Paper>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                </Paper>
              </motion.div>
            );
          })}
            {isLoading && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Paper
                  elevation={2}
                  sx={(theme) => ({
                    p: 2,
                    borderRadius: 2,
                    backgroundColor:
                      theme.palette.mode === 'dark'
                        ? theme.palette.grey[800]
                        : theme.palette.grey[100],
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  })}
                >
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: (theme) => `3px solid ${theme.palette.mode === 'dark' ? theme.palette.grey[600] : theme.palette.grey[300]}`,
                      borderTopColor: (theme) => theme.palette.primary.main,
                      animation: 'spin 1s linear infinite',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' },
                      },
                    }}
                  />
                  <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                    {loadingMessage || (
                      <FormattedMessage
                        id="chat.analyzing"
                        defaultMessage="Analyzing data..."
                      />
                    )}
                  </Typography>
                </Paper>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>
          <Divider />
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={(theme) => ({
              p: 0,
              px: 0,
              pb: 2,
              pt: 2,
              display: 'flex',
              gap: 1,
              alignItems: 'center',
              backgroundColor: 'background.paper',
              width: '100%',
            })}
          >
            <Box sx={{ flex: 1, px: 2 }}>
              <AnimatedTextField
                fullWidth
                size="medium"
                placeholder={formatMessage({
                  id: 'chat.input.placeholder',
                  defaultMessage: 'Type your message...',
                })}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              disabled={isLoading || isCreatingGame}
              />
            </Box>
            <Box sx={{ pr: 2, flexShrink: 0 }}>
              <IconButton
                type="submit"
              disabled={!input.trim() || isLoading || isCreatingGame}
                color="primary"
                sx={(theme) => ({
                  color: '#FFFFFF',
                  backgroundColor: theme.palette.primary.main,
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                  },
                  '&:disabled': {
                    opacity: 0.5,
                    backgroundColor: theme.palette.action.disabledBackground,
                  },
                })}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogContent>
    </Dialog>
  );
}

