import { AnimatedTextField } from '@/components/animated/AnimatedTextField';
import { GameLevel, GameType } from '@/modules/coinleague/constants/enums';
import { AppDialogTitle } from '@/modules/common/components/AppDialogTitle';
import { getNetworkSlugFromChainId } from '@/modules/common/utils';
import { useWeb3React } from '@dexkit/wallet-connectors/hooks/useWeb3React';
import SendIcon from '@mui/icons-material/Send';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogProps,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
  useTheme
} from '@mui/material';
import { BigNumber } from 'ethers';
import { getAddress } from 'ethers/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useCoinToPlayStable, useCreateGameMutation, useCreateGameServerMutation, useTotalGamesMutation } from '../hooks/coinleague';
import { useFactoryAddress } from '../hooks/coinleagueFactory';
import { joinGame } from '../services/coinLeagueFactoryV3';
import { GET_GAME_LEVEL_AMOUNTS } from '../utils/game';
import { AvailableGame, Message, TokenPerformance } from '../types/chat';

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
  const [gameJoinState, setGameJoinState] = useState<{
    gameId?: number;
    chainId?: number;
    maxCoins?: number;
    captainCoin?: string;
    selectedCoins?: string[];
  }>({});
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const [isSelectingToken, setIsSelectingToken] = useState(false); // Block token selection while processing
  const [isSelectingGame, setIsSelectingGame] = useState(false); // Block game selection while processing
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('24h');
  const [tokenAnalysisData, setTokenAnalysisData] = useState<{
    [timeframe: string]: { tokens: TokenPerformance[]; timePeriod: string };
  }>({});
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

  const getTokenAddressesFromSymbols = async (symbolsOrAddresses: string[], chainId: number): Promise<{ captainCoin: string; coinFeeds: string[] } | null> => {
    try {
      const addresses: string[] = [];
      const symbols: string[] = [];

      for (const item of symbolsOrAddresses) {
        if (item.startsWith('0x') && item.length === 42) {
          addresses.push(item);
        } else {
          symbols.push(item);
        }
      }

      if (symbols.length === 0 && addresses.length === symbolsOrAddresses.length) {
        const captainCoin = addresses[0];
        const coinFeeds = addresses.slice(1);
        return { captainCoin, coinFeeds };
      }

      if (symbols.length > 0) {
        
        let availableTokensList: any[] = [];
        const currentTimeframe = selectedTimeframe || '24h';
        if (tokenAnalysisData[currentTimeframe]?.tokens) {
          availableTokensList = tokenAnalysisData[currentTimeframe].tokens;
        }
        
        if (availableTokensList.length === 0 && availableTokens) {
          availableTokensList = availableTokens;
        }
        
        if (availableTokensList.length === 0) {
        const response = await fetch('/api/query-database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'Get tokens by symbols',
            context: { chainId },
          }),
        });

        if (!response.ok) {
          return null;
        }

        const data = await response.json();

          if (data.data?.tokens && Array.isArray(data.data.tokens)) {
            availableTokensList = data.data.tokens;
          } else if (data.tokens && Array.isArray(data.tokens)) {
            availableTokensList = data.tokens;
          } else {
          return null;
          }
        }

        for (const symbol of symbols) {
          const token = availableTokensList.find((t: any) =>
            t.symbol?.toLowerCase() === symbol.toLowerCase() ||
            t.name?.toLowerCase() === symbol.toLowerCase()
          );

          if (token && token.address) {
            addresses.push(token.address);
          } else {
            return null;
          }
        }
      }

      if (addresses.length === 0) {
        return null;
      }

      const captainCoin = addresses[0];
      const coinFeeds = addresses.slice(1);


      return { captainCoin, coinFeeds };
    } catch (error) {
      return null;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isUserScrolling) {
    scrollToBottom();
    }
  }, [messages, isUserScrolling]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      setIsUserScrolling(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsUserScrolling(false);
      }, 1000);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  useEffect(() => {
    if (initialMessage && !hasGeneratedInitialResponse) {
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: initialMessage,
        timestamp: new Date(),
      };
      setMessages([userMessage]);

      if (initialData && initialData.tokens && initialData.tokens.length > 0) {
        setHasGeneratedInitialResponse(true);
        generateAIResponse(initialMessage, initialData);
      } else {
        setHasGeneratedInitialResponse(true);
        generateAIResponse(initialMessage);
      }
    }
  }, [initialMessage, hasGeneratedInitialResponse]);

  useEffect(() => {
    if (initialMessage && hasGeneratedInitialResponse && initialData && initialData.tokens && initialData.tokens.length > 0) {
      const hasAssistantMessage = messages.some(m => m.role === 'assistant');

      const lastMessage = messages[messages.length - 1];
      const isPlaceholderMessage = lastMessage?.role === 'assistant' &&
        (lastMessage.content.length < 100 ||
          lastMessage.content.toLowerCase().includes('momento') ||
          lastMessage.content.toLowerCase().includes('obteniendo') ||
          lastMessage.content.toLowerCase().includes('dame'));

      if (!hasAssistantMessage || isPlaceholderMessage) {
        if (isPlaceholderMessage) {
          setMessages(prev => prev.filter(m => m.id !== lastMessage.id));
        }
        generateAIResponse(initialMessage, initialData);
      }
    }
  }, [initialData, initialMessage, hasGeneratedInitialResponse, messages]);

  const generateAIResponse = async (userMessage: string, tokenData?: { tokens: TokenPerformance[]; timePeriod: string }, overrideGameJoinState?: typeof gameJoinState) => {
    setIsLoading(true);
    try {
      const currentGameJoinState = overrideGameJoinState !== undefined ? overrideGameJoinState : gameJoinState;
      
      if (chainId) {
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

        const isAskingForCaptainCoin = userMessage.toLowerCase().includes('capitán') || 
          userMessage.toLowerCase().includes('captain') ||
          userMessage.toLowerCase().includes('moneda capitán') ||
          userMessage.toLowerCase().includes('captain coin') ||
          userMessage.toLowerCase().includes('seleccionar') ||
          userMessage.toLowerCase().includes('select') ||
          userMessage.toLowerCase().includes('elegir') ||
          userMessage.toLowerCase().includes('choose');
        
        if (!tokenData && (isTokenQuery || isAskingForCaptainCoin)) {
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
                tokenData = analysisData;
              }
            }
          } catch (error) {
          }
        }
      }

      if (tokenData && tokenData.tokens && tokenData.tokens.length > 0) {
      } else {
      }

      const hasGameJoinContext = currentGameJoinState?.gameId !== undefined;

      let updatedGameCreationState = { ...gameCreationState };
      let updatedGameJoinState = { ...currentGameJoinState };

      if (hasGameJoinContext) {
        if (overrideGameJoinState !== undefined) {
          updatedGameJoinState = overrideGameJoinState;
        } else {
          const userMessageLower = userMessage.toLowerCase();
          const wantsToCancel = userMessageLower.includes('no') ||
            userMessageLower.includes('cancel') ||
            userMessageLower.includes('cancelar') ||
            userMessageLower.includes('change') ||
            userMessageLower.includes('cambiar') ||
            userMessageLower.includes('empezar de nuevo') ||
            userMessageLower.includes('start over') ||
            userMessageLower.includes('reset');

          if (wantsToCancel) {
            updatedGameJoinState = {
              ...updatedGameJoinState,
              captainCoin: undefined,
              selectedCoins: [],
            };
            setGameJoinState(updatedGameJoinState);
          } else {
            const tokenSymbolPattern = /^[A-Z]{2,10}$/;
            const isTokenSymbol = tokenSymbolPattern.test(userMessage.trim().toUpperCase());

            if (isTokenSymbol) {
              const tokenSymbol = userMessage.trim().toUpperCase();
              
              if (updatedGameJoinState.captainCoin === tokenSymbol) {
              } else if (!updatedGameJoinState.captainCoin) {
                updatedGameJoinState.captainCoin = tokenSymbol;
                updatedGameJoinState.selectedCoins = [];
              } else {
                const maxCoinsNum = typeof updatedGameJoinState.maxCoins === 'string' 
                  ? parseInt(updatedGameJoinState.maxCoins, 10) 
                  : (updatedGameJoinState.maxCoins || 2);
                const requiredCoins = maxCoinsNum - 1;
                const currentSelected = updatedGameJoinState.selectedCoins || [];
                
                if (!currentSelected.includes(tokenSymbol) && currentSelected.length < requiredCoins) {
                  updatedGameJoinState.selectedCoins = [...currentSelected, tokenSymbol];
                }
              }
            } else {
              try {
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
                  
                  if (parsedParams.selectedCoins && Array.isArray(parsedParams.selectedCoins) && parsedParams.selectedCoins.length > 0) {
                    if (!updatedGameJoinState.captainCoin && parsedParams.selectedCoins.length > 0) {
                      updatedGameJoinState.captainCoin = parsedParams.selectedCoins[0];
                      updatedGameJoinState.selectedCoins = parsedParams.selectedCoins.slice(1);
                    } else if (updatedGameJoinState.captainCoin) {
                      const maxCoins = updatedGameJoinState.maxCoins || 2;
                      const remainingSlots = maxCoins - 1 - (updatedGameJoinState.selectedCoins?.length || 0);
                      const coinsToAdd = parsedParams.selectedCoins
                        .filter((coin: string) => !updatedGameJoinState.selectedCoins?.includes(coin))
                        .slice(0, remainingSlots);
                      
                      updatedGameJoinState.selectedCoins = [
                        ...(updatedGameJoinState.selectedCoins || []),
                        ...coinsToAdd
                      ];
                    }
                  }
                }
              } catch (error) {
              }
            }
          }
        }
      } else {
      try {
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
          
          const userMessageLower = userMessage.toLowerCase();
          if (!parsedParams.gameType && !updatedGameCreationState.gameType) {
            if (userMessageLower.includes('bull') && (userMessageLower.includes('juego') || userMessageLower.includes('game') || userMessageLower.includes('crea') || userMessageLower.includes('create'))) {
              parsedParams.gameType = 'bull';
            } else if (userMessageLower.includes('bear') && (userMessageLower.includes('juego') || userMessageLower.includes('game') || userMessageLower.includes('crea') || userMessageLower.includes('create'))) {
              parsedParams.gameType = 'bear';
            }
          }
          
          const finalGameType = updatedGameCreationState.gameType || parsedParams.gameType;
          
          updatedGameCreationState = {
            ...updatedGameCreationState,
            ...(finalGameType && { gameType: finalGameType }),
            ...(parsedParams.duration && { duration: parsedParams.duration }),
            ...(parsedParams.gameLevel !== undefined && { gameLevel: parsedParams.gameLevel }),
            ...(parsedParams.maxCoins && { maxCoins: parsedParams.maxCoins }),
            ...(parsedParams.maxPlayers && { maxPlayers: parsedParams.maxPlayers }),
            ...(updatedGameCreationState.startDate === undefined && { startDate: Date.now() }),
          };

          setGameCreationState(updatedGameCreationState);
        }
      } catch (error) {
      }
      }

      if (hasGameJoinContext) {
        setGameJoinState(updatedGameJoinState);
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
          gameJoinState: hasGameJoinContext ? updatedGameJoinState : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || 'Failed to get AI response');
      }

      const data = await response.json();

      if (!data || !data.response) {
        throw new Error('No response received from server');
      }


      if (data.response && typeof data.response === 'string' && data.response.trim().length > 0) {
      const messageId = `assistant-${Date.now()}`;
      const fullContent = data.response;

      let tokenDataForMessage = data.tokenPerformanceData && data.tokenPerformanceData.tokens
        ? data.tokenPerformanceData
        : undefined;

      if (hasGameJoinContext && updatedGameJoinState.captainCoin && !tokenDataForMessage) {
        const maxCoinsNum = typeof updatedGameJoinState.maxCoins === 'string' 
          ? parseInt(updatedGameJoinState.maxCoins, 10) 
          : (updatedGameJoinState.maxCoins || 2);
          const requiredCoins = maxCoinsNum - 1;
        const selectedCoinsCount = updatedGameJoinState.selectedCoins?.length || 0;
        const needsMoreCoins = selectedCoinsCount < requiredCoins;
        
        const isAskingForRemainingCoins = fullContent.toLowerCase().includes('restante') ||
          fullContent.toLowerCase().includes('remaining') ||
          fullContent.toLowerCase().includes('más') ||
          fullContent.toLowerCase().includes('more') ||
          fullContent.toLowerCase().includes('adicional') ||
          fullContent.toLowerCase().includes('additional') ||
          fullContent.toLowerCase().includes('selecciona') ||
          fullContent.toLowerCase().includes('select') ||
          fullContent.toLowerCase().includes('elige') ||
          fullContent.toLowerCase().includes('choose');
        
        if (needsMoreCoins && isAskingForRemainingCoins && chainId) {
          try {
            const finalChainId = chainId || accountChainId;
            if (finalChainId) {
              const analysisResponse = await fetch('/api/analyze-tokens', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  text: `Show me all available tokens with their performance data and price analysis for the last 24 hours. I need to see all tokens with their current prices and price changes.`,
                  chainId: finalChainId,
                }),
              });

              if (analysisResponse.ok) {
                const analysisData = await analysisResponse.json();
                if (analysisData && analysisData.tokens && Array.isArray(analysisData.tokens) && analysisData.tokens.length > 0) {
                  tokenDataForMessage = {
                    tokens: analysisData.tokens,
                    timePeriod: analysisData.timePeriod || '24h',
                  };
                }
              }
            }
          } catch (error) {
            }
          }
        }

        const isConfirmationMessage = hasGameJoinContext && 
          updatedGameJoinState.captainCoin && 
          updatedGameJoinState.selectedCoins && 
          updatedGameJoinState.selectedCoins.length > 0;
        
        const maxCoinsNum = isConfirmationMessage 
          ? (typeof updatedGameJoinState.maxCoins === 'string' 
              ? parseInt(updatedGameJoinState.maxCoins, 10) 
              : (updatedGameJoinState.maxCoins || 2))
          : 0;
        const requiredCoins = maxCoinsNum - 1;
        const hasAllCoins = isConfirmationMessage && 
          updatedGameJoinState.selectedCoins.length >= requiredCoins;
        
        const isAskingForConfirmation = hasAllCoins && (
          fullContent.toLowerCase().includes('ready') ||
          fullContent.toLowerCase().includes('listo') ||
          fullContent.toLowerCase().includes('confirm') ||
          fullContent.toLowerCase().includes('confirmar') ||
          fullContent.toLowerCase().includes('yes') ||
          fullContent.toLowerCase().includes('sí') ||
          fullContent.toLowerCase().includes('unirse') ||
          fullContent.toLowerCase().includes('join')
        );

      let messageOptions: Message['options'] = undefined;
      const contentLower = fullContent.toLowerCase();
      
      if (!updatedGameCreationState.gameType && 
          (contentLower.includes('qué tipo') || contentLower.includes('what type') ||
          (contentLower.includes('tipo') && (contentLower.includes('deseas') || contentLower.includes('prefieres') || contentLower.includes('quieres') || 
           contentLower.includes('want') || contentLower.includes('prefer') || contentLower.includes('choose'))) ||
          (contentLower.includes('type') && (contentLower.includes('want') || contentLower.includes('prefer') || contentLower.includes('choose') || 
           contentLower.includes('deseas') || contentLower.includes('prefieres') || contentLower.includes('quieres'))) ||
          (contentLower.includes('bull') && contentLower.includes('bear') && 
           (contentLower.includes('opciones') || contentLower.includes('options') || contentLower.includes('elige') || contentLower.includes('choose'))) ||
          (contentLower.includes('alcista') && contentLower.includes('bajista') && 
           (contentLower.includes('opciones') || contentLower.includes('options') || contentLower.includes('elige') || contentLower.includes('choose'))) ||
          (contentLower.includes('bullish') && contentLower.includes('bearish') && 
           (contentLower.includes('opciones') || contentLower.includes('options') || contentLower.includes('elige') || contentLower.includes('choose'))))) {
        messageOptions = [
          {
            id: 'game-type-bull',
            label: formatMessage({
              id: 'chat.option.game.type.bull',
              defaultMessage: 'Bull (Bullish) - Prices go up',
            }),
            value: 'bull',
            checked: false,
          },
          {
            id: 'game-type-bear',
            label: formatMessage({
              id: 'chat.option.game.type.bear',
              defaultMessage: 'Bear (Bearish) - Prices go down',
            }),
            value: 'bear',
            checked: false,
          },
        ];
      }
      else if (!updatedGameCreationState.duration && (
          contentLower.includes('duración') || contentLower.includes('duration') ||
          contentLower.includes('cuánto tiempo') || contentLower.includes('how long') ||
          (contentLower.includes('tiempo') && (contentLower.includes('dure') || contentLower.includes('dure el') || contentLower.includes('dure el juego'))) ||
          (contentLower.includes('time') && (contentLower.includes('last') || contentLower.includes('should last'))) ||
          contentLower.includes('días') || contentLower.includes('days') ||
          contentLower.includes('semana') || contentLower.includes('week') ||
          contentLower.includes('3600') || contentLower.includes('14400') ||
          contentLower.includes('28800') || contentLower.includes('86400') ||
          contentLower.includes('604800') ||
          (contentLower.includes('hora') && (contentLower.includes('3600') || contentLower.includes('14400') || contentLower.includes('28800') || contentLower.includes('86400') || contentLower.includes('604800') || contentLower.includes('segundos'))) ||
          (contentLower.includes('hour') && (contentLower.includes('3600') || contentLower.includes('14400') || contentLower.includes('28800') || contentLower.includes('86400') || contentLower.includes('604800') || contentLower.includes('seconds'))))) {
        messageOptions = [
          { id: 'duration-1h', label: formatMessage({ id: 'chat.option.duration.1h', defaultMessage: '1 hour' }), value: 3600, checked: false },
          { id: 'duration-4h', label: formatMessage({ id: 'chat.option.duration.4h', defaultMessage: '4 hours' }), value: 14400, checked: false },
          { id: 'duration-8h', label: formatMessage({ id: 'chat.option.duration.8h', defaultMessage: '8 hours' }), value: 28800, checked: false },
          { id: 'duration-24h', label: formatMessage({ id: 'chat.option.duration.24h', defaultMessage: '24 hours' }), value: 86400, checked: false },
          { id: 'duration-7d', label: formatMessage({ id: 'chat.option.duration.7d', defaultMessage: '7 days' }), value: 604800, checked: false },
        ];
      }
      else if ((contentLower.includes('nivel') || contentLower.includes('level') || 
          contentLower.includes('dificultad') || contentLower.includes('difficulty') ||
          contentLower.includes('principiante') || contentLower.includes('beginner') ||
          contentLower.includes('intermedio') || contentLower.includes('intermediate') ||
          contentLower.includes('avanzado') || contentLower.includes('advanced') ||
          contentLower.includes('expert') || contentLower.includes('master') ||
          contentLower.includes('grandmaster') || contentLower.includes('grand master') ||
          contentLower.includes('0.001') || contentLower.includes('1.0') || contentLower.includes('10.0') ||
          contentLower.includes('25.0') || contentLower.includes('100.0') || contentLower.includes('250.0')) && 
          updatedGameCreationState.gameLevel === undefined) {
        messageOptions = [
          { id: 'level-1', label: formatMessage({ id: 'chat.option.level.1', defaultMessage: 'Level 1 (Beginner) - Entry: 0.001 USDT' }), value: 1, checked: false },
          { id: 'level-2', label: formatMessage({ id: 'chat.option.level.2', defaultMessage: 'Level 2 (Intermediate) - Entry: 1.0 USDT' }), value: 2, checked: false },
          { id: 'level-3', label: formatMessage({ id: 'chat.option.level.3', defaultMessage: 'Level 3 (Advanced) - Entry: 10.0 USDT' }), value: 3, checked: false },
          { id: 'level-4', label: formatMessage({ id: 'chat.option.level.4', defaultMessage: 'Level 4 (Expert) - Entry: 25.0 USDT' }), value: 4, checked: false },
          { id: 'level-5', label: formatMessage({ id: 'chat.option.level.5', defaultMessage: 'Level 5 (Master) - Entry: 100.0 USDT' }), value: 5, checked: false },
          { id: 'level-6', label: formatMessage({ id: 'chat.option.level.6', defaultMessage: 'Level 6 (GrandMaster) - Entry: 250.0 USDT' }), value: 6, checked: false },
        ];
      }
      else if ((contentLower.includes('monedas') || contentLower.includes('coins') || 
          contentLower.includes('tokens') ||
          (contentLower.includes('cuántas') && contentLower.includes('monedas')) ||
          (contentLower.includes('how many') && contentLower.includes('coins')) ||
          (contentLower.includes('cuántos') && contentLower.includes('tokens'))) && 
          !updatedGameCreationState.maxCoins) {
        messageOptions = [
          { id: 'max-coins-2', label: formatMessage({ id: 'chat.option.max.coins.2', defaultMessage: '2 coins' }), value: 2, checked: false },
          { id: 'max-coins-3', label: formatMessage({ id: 'chat.option.max.coins.3', defaultMessage: '3 coins' }), value: 3, checked: false },
          { id: 'max-coins-4', label: formatMessage({ id: 'chat.option.max.coins.4', defaultMessage: '4 coins' }), value: 4, checked: false },
          { id: 'max-coins-5', label: formatMessage({ id: 'chat.option.max.coins.5', defaultMessage: '5 coins' }), value: 5, checked: false },
        ];
      }
      else if ((contentLower.includes('jugadores') || contentLower.includes('players') ||
          (contentLower.includes('cuántos') && contentLower.includes('jugadores')) ||
          (contentLower.includes('how many') && contentLower.includes('players')) ||
          (contentLower.includes('cuántas') && contentLower.includes('personas'))) && 
          !updatedGameCreationState.maxPlayers) {
        messageOptions = [
          { id: 'max-players-2', label: formatMessage({ id: 'chat.option.max.players.2', defaultMessage: '2 players' }), value: 2, checked: false },
          { id: 'max-players-5', label: formatMessage({ id: 'chat.option.max.players.5', defaultMessage: '5 players' }), value: 5, checked: false },
          { id: 'max-players-10', label: formatMessage({ id: 'chat.option.max.players.10', defaultMessage: '10 players' }), value: 10, checked: false },
          { id: 'max-players-20', label: formatMessage({ id: 'chat.option.max.players.20', defaultMessage: '20 players' }), value: 20, checked: false },
        ];
      }

      const assistantMessage: Message = {
        id: messageId,
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
        isTyping: false,
        tokenPerformanceData: tokenDataForMessage,
        isConfirmationMessage: isConfirmationMessage && hasAllCoins && isAskingForConfirmation,
        gameJoinState: isConfirmationMessage && hasAllCoins ? updatedGameJoinState : undefined,
        options: messageOptions,
        onOptionChange: messageOptions ? (optionId: string, checked: boolean) => {
          setMessages((prev) => {
            return prev.map(msg => {
              if (msg.id !== messageId || !msg.options) return msg;
              
              const option = msg.options.find(opt => opt.id === optionId);
              if (!option) return msg;
              
              const updatedOptions = msg.options.map(opt => 
                opt.id === optionId ? { ...opt, checked } : { ...opt, checked: false }
              );
              
              if (checked) {
                if (optionId.startsWith('game-type-')) {
                  setGameCreationState(prev => ({
                    ...prev,
                    gameType: option.value as 'bull' | 'bear',
                  }));
                  const userMessage: Message = {
                    id: `user-${Date.now()}`,
                    role: 'user',
                    content: option.value === 'bull' 
                      ? formatMessage({ id: 'chat.user.message.bull', defaultMessage: 'Bull' })
                      : formatMessage({ id: 'chat.user.message.bear', defaultMessage: 'Bear' }),
                    timestamp: new Date(),
                  };
                  setMessages((prevMessages) => [...prevMessages, userMessage]);
                  setTimeout(() => {
                    generateAIResponse(option.value as string);
                  }, 300);
                } else if (optionId.startsWith('duration-')) {
                  setGameCreationState(prev => ({
                    ...prev,
                    duration: option.value as number,
                  }));
                  const userMessage: Message = {
                    id: `user-${Date.now()}`,
                    role: 'user',
                    content: formatMessage(
                      { id: 'chat.user.message.duration.seconds', defaultMessage: '{seconds} seconds' },
                      { seconds: option.value }
                    ),
                    timestamp: new Date(),
                  };
                  setMessages((prevMessages) => [...prevMessages, userMessage]);
                  setTimeout(() => {
                    generateAIResponse(formatMessage(
                      { id: 'chat.user.message.duration.seconds', defaultMessage: '{seconds} seconds' },
                      { seconds: option.value }
                    ));
                  }, 300);
                } else if (optionId.startsWith('level-')) {
                  setGameCreationState(prev => ({
                    ...prev,
                    gameLevel: option.value as number,
                  }));
                  const userMessage: Message = {
                    id: `user-${Date.now()}`,
                    role: 'user',
                    content: formatMessage(
                      { id: 'chat.user.message.level', defaultMessage: 'Level {level}' },
                      { level: option.value }
                    ),
                    timestamp: new Date(),
                  };
                  setMessages((prevMessages) => [...prevMessages, userMessage]);
                  setTimeout(() => {
                    generateAIResponse(formatMessage(
                      { id: 'chat.user.message.level', defaultMessage: 'Level {level}' },
                      { level: option.value }
                    ));
                  }, 300);
                } else if (optionId.startsWith('max-coins-')) {
                  setGameCreationState(prev => ({
                    ...prev,
                    maxCoins: option.value as number,
                  }));
                  const userMessage: Message = {
                    id: `user-${Date.now()}`,
                    role: 'user',
                    content: formatMessage(
                      { id: 'chat.user.message.coins', defaultMessage: '{count} coins' },
                      { count: option.value }
                    ),
                    timestamp: new Date(),
                  };
                  setMessages((prevMessages) => [...prevMessages, userMessage]);
                  setTimeout(() => {
                    generateAIResponse(formatMessage(
                      { id: 'chat.user.message.coins', defaultMessage: '{count} coins' },
                      { count: option.value }
                    ));
                  }, 300);
                } else if (optionId.startsWith('max-players-')) {
                  setGameCreationState(prev => ({
                    ...prev,
                    maxPlayers: option.value as number,
                  }));
                  const userMessage: Message = {
                    id: `user-${Date.now()}`,
                    role: 'user',
                    content: formatMessage(
                      { id: 'chat.user.message.players', defaultMessage: '{count} players' },
                      { count: option.value }
                    ),
                    timestamp: new Date(),
                  };
                  setMessages((prevMessages) => [...prevMessages, userMessage]);
                  setTimeout(() => {
                    generateAIResponse(formatMessage(
                      { id: 'chat.user.message.players', defaultMessage: '{count} players' },
                      { count: option.value }
                    ));
                  }, 300);
                }
              }
              
              return { ...msg, options: updatedOptions };
            });
          });
        } : undefined,
      };


      setMessages((prev) => {
        const updated = [...prev, assistantMessage];
        return updated;
      });
      
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      if (tokenDataForMessage) {
        setTimeout(() => {
          scrollToBottom();
        }, 300);
        }
      } else if (!data.response || typeof data.response !== 'string' || data.response.trim().length === 0) {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: formatMessage({
            id: 'chat.error.no.response',
            defaultMessage: 'I apologize, but I did not receive a valid response. Please try again.',
          }),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }

      if (hasGameJoinContext && updatedGameJoinState.captainCoin && updatedGameJoinState.selectedCoins) {
        const maxCoinsNum = typeof updatedGameJoinState.maxCoins === 'string' 
          ? parseInt(updatedGameJoinState.maxCoins, 10) 
          : (updatedGameJoinState.maxCoins || 2);
        const requiredCoins = maxCoinsNum - 1;
        const hasAllCoins = updatedGameJoinState.selectedCoins.length >= requiredCoins;

        const isReadyToJoin = userMessage.toLowerCase().includes('listo') ||
          userMessage.toLowerCase().includes('ready') ||
          userMessage.toLowerCase().includes('unirse') ||
          userMessage.toLowerCase().includes('join') ||
          userMessage.toLowerCase().includes('confirmar') ||
          userMessage.toLowerCase().includes('confirm') ||
          userMessage.toLowerCase().includes('ejecutar') ||
          userMessage.toLowerCase().includes('execute') ||
          userMessage.toLowerCase().includes('sí') ||
          userMessage.toLowerCase().includes('yes');

        if (isReadyToJoin && hasAllCoins) {
          await executeJoinGame();
          setIsSelectingToken(false);
          return;
        }
      }

      if (hasGameJoinContext) {
        const userMessageLower = userMessage.toLowerCase();
        const wantsToEdit = userMessageLower.includes('no') ||
          userMessageLower.includes('cancel') ||
          userMessageLower.includes('cancelar') ||
          userMessageLower.includes('change') ||
          userMessageLower.includes('cambiar') ||
          userMessageLower.includes('editar') ||
          userMessageLower.includes('edit') ||
          userMessageLower.includes('reset') ||
          userMessageLower.includes('empezar de nuevo') ||
          userMessageLower.includes('start over');

        if (wantsToEdit) {
          setGameJoinState({
            gameId: updatedGameJoinState.gameId,
            chainId: updatedGameJoinState.chainId,
            maxCoins: updatedGameJoinState.maxCoins,
            captainCoin: undefined,
            selectedCoins: [],
          });
        }
      }

      if (data.action && data.action.type === 'create_game' && data.action.gameParams) {
        await handleCreateGame(data.action.gameParams);
        setIsSelectingToken(false);
        return;
      }

      if (data.action && data.action.type === 'find_games' && data.action.findGamesParams && !hasGameJoinContext) {
        await handleFindGames(data.action.findGamesParams);
        setIsSelectingToken(false);
        return;
      }
      
      if (data.action && data.action.type === 'find_games' && hasGameJoinContext) {
      }

      if (data.action && data.action.type === 'join_existing_game' && data.action.joinGameParams) {
        const maxCoinsNum = typeof updatedGameJoinState.maxCoins === 'string' 
          ? parseInt(updatedGameJoinState.maxCoins, 10) 
          : (updatedGameJoinState.maxCoins || 2);
        const requiredCoins = maxCoinsNum - 1;
        const hasAllCoins = updatedGameJoinState.selectedCoins?.length >= requiredCoins;
        
        if (!hasAllCoins || !updatedGameJoinState.captainCoin) {
          await handleJoinExistingGame(data.action.joinGameParams);
          setIsSelectingToken(false);
          return;
        } else {
        }
      }
      
      setIsSelectingToken(false);
    } catch (error) {
      setIsSelectingToken(false);
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
      let tokenAddresses: { captainCoin: string; coinFeeds: string[] } | null = null;
      const selectedCoins = gameParams.selectedCoins && gameParams.selectedCoins.length > 0
        ? gameParams.selectedCoins
        : (gameCreationState?.selectedCoins && gameCreationState.selectedCoins.length > 0
          ? gameCreationState.selectedCoins
          : []);
      
      if (selectedCoins.length > 0) {
        const finalChainId = chainId || accountChainId;
        if (!finalChainId) {
          throw new Error('ChainId is not available');
        }
        tokenAddresses = await getTokenAddressesFromSymbols(selectedCoins, finalChainId);

        if (!tokenAddresses) {
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: formatMessage({
              id: 'chat.error.token.addresses',
              defaultMessage: `Could not find token addresses for selected coins: ${selectedCoins.join(', ')}. Some native cryptocurrencies (like Bitcoin, Monero, Tezos) may not be available on this blockchain. Please try again with different coins that are available on this network.`,
            }),
      timestamp: new Date(),
    };
          setMessages((prev) => [...prev, errorMessage]);
          setIsCreatingGame(false);
          return;
        }

      }
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


      let amountToPlay;
      try {
        amountToPlay = GET_GAME_LEVEL_AMOUNTS(
          gameParams.gameLevel,
          chainId,
          coinToPlay.address,
        );
      } catch (error: any) {
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

      const gameTypeValue = gameParams.gameType === 'bear' ? 1 : 0;

      const currentTime = Date.now();
      const minFutureTime = currentTime + 60000;
      const finalStartDate = gameParams.startDate < minFutureTime ? minFutureTime : gameParams.startDate;


      const validDurations = [
        3600,
        14400,
        28800,
        86400,
        604800,
      ];

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

        if (!createGameReceipt) {
          throw new Error('Transaction receipt is null - transaction may have failed');
        }


        if (createGameReceipt.status !== 1) {
          throw new Error(`Transaction failed with status ${createGameReceipt.status}. Transaction hash: ${createGameReceipt.transactionHash}`);
        }

        if (!createGameReceipt.transactionHash || createGameReceipt.transactionHash.length !== 66) {
          throw new Error(`Invalid transaction hash: ${createGameReceipt.transactionHash}`);
        }


        await new Promise(resolve => setTimeout(resolve, 3000));

        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
          gameId = await totalGamesMutation.mutateAsync();
          const gameIdNumber = gameId?.toNumber();

          if (gameId && !gameId.isZero() && gameIdNumber > 0) {
            break;
          }

          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        if (!gameId || gameId.isZero()) {
          throw new Error('Failed to get valid game ID from blockchain after multiple attempts - game may not have been created');
        }

      } catch (createError: any) {

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

        throw createError;
      }


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

        await new Promise(resolve => setTimeout(resolve, 8000));
      } catch (serverError: any) {
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

      await new Promise(resolve => setTimeout(resolve, 5000));

      if (!tokenAddresses && selectedCoins.length > 0 && gameId && provider && signer && factoryAddress) {
        const finalChainId = chainId || accountChainId;
        if (finalChainId) {
          try {
            tokenAddresses = await getTokenAddressesFromSymbols(selectedCoins, finalChainId);
          } catch (error) {
          }
        }
      }

      if (tokenAddresses && gameId && provider && signer && factoryAddress) {
        try {
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

          const selectedCoinsArray = [
            tokenAddresses.captainCoin,
            ...tokenAddresses.coinFeeds
          ];

          const finalChainId = chainId || accountChainId;
          if (!finalChainId) {
            throw new Error('ChainId is not available');
            }

          let validatedJoinData;
          try {
            const joinGameResponse = await fetch('/api/join-game', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
            gameId: gameId.toNumber(),
                selectedCoins: selectedCoinsArray,
                chainId: finalChainId,
            maxCoins: gameParams.maxCoins,
              }),
            });

            if (!joinGameResponse.ok) {
              const errorData = await joinGameResponse.json().catch(() => ({ error: 'Backend validation failed' }));
              throw new Error(errorData.error || 'Failed to validate join game data');
            }

            validatedJoinData = await joinGameResponse.json();
          } catch (validationError: any) {
            throw new Error(`Failed to validate join game data: ${validationError.message || 'Unknown error'}`);
          }

          const checksummedCaptainCoin = validatedJoinData.captainCoin;
          const checksummedFeeds = validatedJoinData.feeds;
          const gameIdString = validatedJoinData.gameId;

          const { getCoinLeagueGameOnChain } = await import('../services/coinleague');
          const gameOnChain = await getCoinLeagueGameOnChain(provider, factoryAddress, gameIdString);
          
          if (!gameOnChain || !gameOnChain.amount_to_play) {
            throw new Error('Could not get game data from blockchain. Please try again.');
          }

          const amountToPlay = BigNumber.from(gameOnChain.amount_to_play);


          const affiliateAddress = undefined;

          let joinTx;
          try {
            joinTx = await joinGame({
              factoryAddress,
              feeds: checksummedFeeds,
              captainCoin: checksummedCaptainCoin,
              provider: provider,
              signer: signer,
              id: gameIdString,
              affiliate: affiliateAddress,
              value: amountToPlay,
            });
          } catch (joinError: any) {

            if (joinError.reason || joinError.message?.includes('Panic')) {
              throw new Error(`Failed to join game: ${joinError.reason || joinError.message || 'Unknown error'}. Please check that the game exists and the token addresses are valid.`);
            }
            throw joinError;
          }


          const joinReceipt = await joinTx.wait();

          if (!joinReceipt) {
            throw new Error('Join transaction receipt is null - transaction may have failed');
          }


          if (joinReceipt.status !== 1) {
            throw new Error(`Join transaction failed with status ${joinReceipt.status}. Transaction hash: ${joinReceipt.transactionHash}`);
          }

          if (!joinReceipt.transactionHash || joinReceipt.transactionHash.length !== 66) {
            throw new Error(`Invalid join transaction hash: ${joinReceipt.transactionHash}`);
          }


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

          const finalChainIdForNav = chainId || accountChainId;
          const networkSlug = getNetworkSlugFromChainId(finalChainIdForNav);

          if (!networkSlug) {
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

          setTimeout(() => {
            router.push(`/game/${networkSlug}/${gameId.toNumber()}`);
          if (onClose) {
            onClose({}, 'escapeKeyDown');
          }
          }, 2000);
        } catch (joinError: any) {
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

          setIsCreatingGame(false);
          return;
        }
      } else {

        if (gameId) {
          const finalChainIdForNav = chainId || accountChainId;
          const networkSlug = getNetworkSlugFromChainId(finalChainIdForNav);

          if (networkSlug) {
            let errorMessage: Message;
            
            if (!selectedCoins || selectedCoins.length === 0) {
              errorMessage = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: formatMessage({
                  id: 'chat.game.created.no.tokens',
                  defaultMessage: `Game #${gameId.toNumber()} created successfully! However, no tokens were selected during game creation. Please join manually from the game page and select your tokens.`,
                }, { gameId: gameId.toNumber() }),
                timestamp: new Date(),
              };
            } else if (!tokenAddresses) {
              errorMessage = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: formatMessage({
                  id: 'chat.game.created.token.addresses.error',
                  defaultMessage: `Game #${gameId.toNumber()} created successfully! However, there was an error getting token addresses. Please join manually from the game page.`,
                }, { gameId: gameId.toNumber() }),
                timestamp: new Date(),
              };
            } else {
              errorMessage = {
              id: `error-${Date.now()}`,
              role: 'assistant',
              content: formatMessage({
                id: 'chat.game.created.manual.join',
                defaultMessage: `Game #${gameId.toNumber()} created successfully! Please join manually from the game page.`,
              }, { gameId: gameId.toNumber() }),
              timestamp: new Date(),
            };
            }
            
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
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: formatMessage({
          id: 'chat.error.create.game',
          defaultMessage: `Error creating game: ${error.message || 'Unknown error'}. Please try again.`,
        }),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsCreatingGame(false);
    }
  };

  const handleFindGames = async (findGamesParams: {
    gameType?: 'bull' | 'bear';
    maxEntry?: string;
    minEntry?: string;
    chainId?: number;
    status?: 'Waiting' | 'Started' | 'Finished';
    limit?: number;
  }) => {
    try {
      setIsLoading(true);
      
      setMessages((prev) => {
        const hasSearchingMessage = prev.some(msg => 
          msg.id.startsWith('searching-') || 
          msg.content.toLowerCase().includes('searching for available games')
        );
        
        if (hasSearchingMessage) {
          return prev;
        }
      
      const searchMessage: Message = {
        id: `searching-${Date.now()}`,
        role: 'assistant',
        content: formatMessage({
          id: 'chat.searching.games',
          defaultMessage: 'Searching for available games...',
        }),
        timestamp: new Date(),
      };
        return [...prev, searchMessage];
      });

      const finalChainId = findGamesParams.chainId || chainId || accountChainId;
      
      const response = await fetch('/api/find-games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...findGamesParams,
          chainId: finalChainId,
          userAddress: account ? account.toLowerCase() : undefined, // Exclude games where user is already participating
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Backend request failed' }));
        throw new Error(errorData.error || `Failed to find games: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      const gamesMessage: Message = {
        id: `games-found-${Date.now()}`,
        role: 'assistant',
        content: formatMessage({
          id: 'chat.games.found',
          defaultMessage: result.count > 0 
            ? `Found ${result.count} available game${result.count > 1 ? 's' : ''}. Please select one from the list below:`
            : 'No games found matching your criteria. Try adjusting your search parameters or create a new game.',
        }, { count: result.count }),
        timestamp: new Date(),
        availableGames: result.games || [],
      };
      
      setMessages((prev) => [...prev, gamesMessage]);
      
      if (result.count === 0) {
        const suggestionMessage: Message = {
          id: `suggestion-${Date.now()}`,
          role: 'assistant',
          content: formatMessage({
            id: 'chat.no.games.suggestion',
            defaultMessage: 'Would you like to create a new game instead? Just tell me what type of game you want to create!',
          }),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, suggestionMessage]);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: formatMessage({
          id: 'chat.error.find.games',
          defaultMessage: `Error searching for games: ${error.message || 'Unknown error'}. Please try again.`,
        }),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinExistingGame = async (joinGameParams: {
    gameId: number;
    chainId: number;
  }) => {
    if (!provider || !factoryAddress || !signer) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: formatMessage({
          id: 'chat.error.wallet',
          defaultMessage: 'Please connect your wallet to join the game.',
        }),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    setGameJoinState({
      gameId: joinGameParams.gameId,
      chainId: joinGameParams.chainId || chainId || accountChainId,
      captainCoin: undefined,
      selectedCoins: [],
    });

    const joinStartMessage: Message = {
      id: `join-start-${Date.now()}`,
      role: 'assistant',
      content: formatMessage({
        id: 'chat.join.game.start',
        defaultMessage: `Perfect! You want to join game #${joinGameParams.gameId}. First, I need you to select your captain coin. Please tell me which token you want to use as your captain coin.`,
      }, { gameId: joinGameParams.gameId }),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, joinStartMessage]);
  };

  const executeJoinGame = async () => {
    if (!provider || !factoryAddress || !signer || !gameJoinState.gameId || !gameJoinState.chainId) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: formatMessage({
          id: 'chat.error.wallet',
          defaultMessage: 'Please connect your wallet to join the game.',
        }),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    if (!gameJoinState.captainCoin || !gameJoinState.selectedCoins || gameJoinState.selectedCoins.length === 0) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: formatMessage({
          id: 'chat.error.missing.coins',
          defaultMessage: 'Please select your captain coin and at least one additional coin before joining the game.',
        }),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    try {
      setIsJoiningGame(true);

      const joiningMessage: Message = {
        id: `joining-${Date.now()}`,
        role: 'assistant',
        content: formatMessage({
          id: 'chat.joining.game',
          defaultMessage: 'Joining the game... Please confirm the transaction in your wallet.',
        }),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, joiningMessage]);

      const finalChainId = gameJoinState.chainId;
      const tokenAddresses = await getTokenAddressesFromSymbols(
        [gameJoinState.captainCoin, ...gameJoinState.selectedCoins],
        finalChainId
      );

      if (!tokenAddresses) {
        throw new Error('Could not find token addresses for selected coins. Some native cryptocurrencies (like Bitcoin, Monero, Tezos) may not be available on this blockchain. Please try again with different coins that are available on this network.');
      }

      const selectedCoinsArray = [
        tokenAddresses.captainCoin,
        ...tokenAddresses.coinFeeds
      ];

      const joinGameResponse = await fetch('/api/join-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: gameJoinState.gameId,
          selectedCoins: selectedCoinsArray,
          chainId: finalChainId,
          maxCoins: gameJoinState.maxCoins || selectedCoinsArray.length,
        }),
      });

      if (!joinGameResponse.ok) {
        const errorData = await joinGameResponse.json().catch(() => ({ error: 'Backend validation failed' }));
        throw new Error(errorData.error || 'Failed to validate join game data');
      }

      const validatedJoinData = await joinGameResponse.json();

      const { getCoinLeagueGameOnChain } = await import('../services/coinleague');
      const gameOnChain = await getCoinLeagueGameOnChain(provider, factoryAddress, validatedJoinData.gameId);
      
      if (!gameOnChain || !gameOnChain.amount_to_play) {
        throw new Error('Could not get game data from blockchain. Please try again.');
      }

      const amountToPlay = BigNumber.from(gameOnChain.amount_to_play);

      const joinTx = await joinGame({
        factoryAddress,
        feeds: validatedJoinData.feeds,
        captainCoin: validatedJoinData.captainCoin,
        provider: provider,
        signer: signer,
        id: validatedJoinData.gameId,
        affiliate: undefined,
        value: amountToPlay,
      });


      const joinReceipt = await joinTx.wait();

      if (!joinReceipt || joinReceipt.status !== 1) {
        throw new Error(`Join transaction failed with status ${joinReceipt?.status || 'unknown'}`);
      }

      const successMessage: Message = {
        id: `success-${Date.now()}`,
        role: 'assistant',
        content: formatMessage({
          id: 'chat.join.game.success',
          defaultMessage: `Successfully joined game #${gameJoinState.gameId}! Redirecting to the game...`,
        }, { gameId: gameJoinState.gameId }),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);

      const networkSlug = getNetworkSlugFromChainId(finalChainId);
      if (networkSlug) {
        setTimeout(() => {
          router.push(`/game/${networkSlug}/${gameJoinState.gameId}`);
          if (onClose) {
            onClose({}, 'escapeKeyDown');
          }
        }, 2000);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: formatMessage({
          id: 'chat.error.join.game',
          defaultMessage: `Error joining game: ${error.message || 'Unknown error'}. Please try again.`,
        }),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsJoiningGame(false);
      setGameJoinState({});
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

    await generateAIResponse(currentInput);
  };

  const handleClose = () => {
    if (onClose) {
      onClose({}, 'escapeKeyDown');
    }
  };

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
              {(() => {
                const filteredMessages = messages.filter((message) => 
                  !message.id.startsWith('join-start') && 
                  !message.id.startsWith('token-analysis')
                );
                const regularMessages = filteredMessages.filter(m => !m.isConfirmationMessage);
                const confirmationMessages = filteredMessages.filter(m => m.isConfirmationMessage);
                return regularMessages;
              })()
                .map((message) => (
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
                            ? '#FFFFFF'
                            : theme.palette.mode === 'dark'
                              ? theme.palette.text.primary
                              : theme.palette.text.primary,
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
                      {message.options && message.options.length > 0 && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                          <Stack spacing={1}>
                            {message.options.map((option) => (
                              <FormControlLabel
                                key={option.id}
                                control={
                                  <Checkbox
                                    checked={option.checked || false}
                                    disabled={option.disabled || isLoading}
                                    onChange={(e) => {
                                      if (message.onOptionChange) {
                                        message.onOptionChange(option.id, e.target.checked);
                                      }
                                    }}
                                    sx={{
                                      color: theme.palette.primary.main,
                                      '&.Mui-checked': {
                                        color: theme.palette.primary.main,
                                      },
                                    }}
                                  />
                                }
                                label={
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      color: theme.palette.text.primary,
                                      userSelect: 'none',
                                    }}
                                  >
                                    {option.label}
                                  </Typography>
                                }
                                sx={{
                                  m: 0,
                                  '&:hover': {
                                    backgroundColor: theme.palette.action.hover,
                                    borderRadius: 1,
                                  },
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  transition: 'background-color 0.2s',
                                }}
                              />
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Paper>
                  </Box>
                </motion.div>
              ))}
            </AnimatePresence>
          {messages.map((msg) => {
            if (!msg.availableGames || msg.availableGames.length === 0) {
              return null;
            }

            return (
              <motion.div
                key={`games-${msg.id}`}
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
                  <Typography 
                    variant="subtitle2" 
                    sx={(theme) => ({ 
                      mb: 1, 
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                    })}
                  >
                    <FormattedMessage
                      id="available.games"
                      defaultMessage="Available Games"
                    />
                  </Typography>
                  <Box
                    sx={{
                      maxHeight: '400px',
                      overflowY: 'auto',
                      pr: 0.5,
                    }}
                  >
                    <Grid container spacing={1.5}>
                      {msg.availableGames.map((game) => {
                        const handleSelectGame = async () => {
                          // Block multiple clicks
                          if (isSelectingGame || isLoading || isJoiningGame) {
                            return;
                          }

                          if (!provider || !factoryAddress || !signer) {
                            const errorMessage: Message = {
                              id: `error-${Date.now()}`,
                              role: 'assistant',
                              content: formatMessage({
                                id: 'chat.error.wallet',
                                defaultMessage: 'Please connect your wallet to join the game.',
                              }),
                              timestamp: new Date(),
                            };
                            setMessages((prev) => [...prev, errorMessage]);
                            return;
                          }

                          setIsSelectingGame(true);
                          try {
                            const { getCoinLeagueGameOnChain } = await import('../services/coinleague');
                            const gameOnChain = await getCoinLeagueGameOnChain(provider, factoryAddress, game.id.toString());
                            
                            if (!gameOnChain) {
                              throw new Error('Game not found on blockchain');
                            }

                            const finalChainId = game.chainId || chainId || accountChainId;
                            
                            const maxCoinsNum = typeof game.numCoins === 'string' 
                              ? parseInt(game.numCoins, 10) 
                              : (game.numCoins || 2);
                            setGameJoinState({
                              gameId: game.id,
                              chainId: finalChainId,
                              maxCoins: maxCoinsNum,
                              captainCoin: undefined,
                              selectedCoins: [],
                            });

                            const joinStartMessage: Message = {
                              id: `join-start-${Date.now()}`,
                              role: 'assistant',
                              content: formatMessage({
                                id: 'chat.join.game.start',
                                defaultMessage: `Perfect! You want to join game #${game.id}. First, I need you to select your captain coin. Please tell me which token you want to use as your captain coin.`,
                              }, { gameId: game.id }),
                              timestamp: new Date(),
                            };
                            setMessages((prev) => [...prev, joinStartMessage]);

                            if (finalChainId) {
                              const fetchTokenAnalysis = async () => {
                                try {
                                  const analysisResponse = await fetch('/api/analyze-tokens', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      text: 'Show me all available tokens with their performance data and price analysis for the last 24 hours. I need to see all tokens with their current prices and price changes.',
                                      chainId: finalChainId,
                                    }),
                                  });

                                  if (analysisResponse.ok) {
                                    const analysisData = await analysisResponse.json();

                                    if (analysisData && analysisData.tokens && Array.isArray(analysisData.tokens) && analysisData.tokens.length > 0) {
                                      const tokenAnalysisMessage: Message = {
                                        id: `token-analysis-${Date.now()}`,
                                        role: 'assistant',
                                        content: formatMessage({
                                          id: 'chat.token.analysis.available',
                                          defaultMessage: 'Here are the available tokens with their performance data to help you choose:',
                                        }),
                                        timestamp: new Date(),
                                        tokenPerformanceData: {
                                          tokens: analysisData.tokens,
                                          timePeriod: analysisData.timePeriod || '24h',
                                        },
                                      };
                                      setMessages((prev) => {
                                        const updated = [...prev, tokenAnalysisMessage];
                                        return updated;
                                      });
                                      setTimeout(() => {
                                        scrollToBottom();
                                      }, 300);
                                    } else {
                                    }
                                  } else {
                                    const errorText = await analysisResponse.text();
                                  }
                                } catch (error) {
                                }
                              };

                              fetchTokenAnalysis();
                            } else {
                            }
                          } catch (error: any) {
                            const errorMessage: Message = {
                              id: `error-${Date.now()}`,
                              role: 'assistant',
                              content: formatMessage({
                                id: 'chat.error.join.game.start',
                                defaultMessage: `Error starting join flow: ${error.message || 'Unknown error'}. Please try again.`,
                              }),
                              timestamp: new Date(),
                            };
                            setMessages((prev) => [...prev, errorMessage]);
                          } finally {
                            setIsSelectingGame(false);
                          }
                        };

                        return (
                          <Grid item xs={12} sm={6} md={4} key={game.id}>
                            <Paper
                              elevation={2}
                              sx={(theme) => ({
                                p: 1.5,
                                borderRadius: 1.5,
                                backgroundColor: theme.palette.background.paper,
                                border: `1px solid ${theme.palette.divider}`,
                                transition: 'all 0.2s',
                                cursor: (isSelectingGame || isLoading || isJoiningGame) ? 'not-allowed' : 'pointer',
                                opacity: (isSelectingGame || isLoading || isJoiningGame) ? 0.6 : 1,
                                pointerEvents: (isSelectingGame || isLoading || isJoiningGame) ? 'none' : 'auto',
                                '&:hover': (isSelectingGame || isLoading || isJoiningGame) ? {} : {
                                  borderColor: theme.palette.primary.main,
                                  boxShadow: `0 2px 8px ${theme.palette.primary.main}20`,
                                  transform: 'translateY(-2px)',
                                },
                              })}
                              onClick={handleSelectGame}
                            >
                              <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Typography 
                                    variant="subtitle2" 
                                    fontWeight={600}
                                    sx={{ color: theme.palette.text.primary }}
                                  >
                                    <FormattedMessage
                                      id="chat.game.room.number"
                                      defaultMessage="Room #{gameId}"
                                      values={{ gameId: game.id }}
                                    />
                                  </Typography>
                                  <Box
                                    sx={{
                                      px: 1,
                                      py: 0.25,
                                      borderRadius: 1,
                                      backgroundColor: game.type === 'bull' 
                                        ? theme.palette.success.main + '20'
                                        : theme.palette.error.main + '20',
                                      color: game.type === 'bull'
                                        ? theme.palette.success.main
                                        : theme.palette.error.main,
                                    }}
                                  >
                                    <Typography variant="caption" fontWeight={600}>
                                      {game.typeName}
                                    </Typography>
                                  </Box>
                                </Stack>
                                
                                <Stack spacing={0.5}>
                                  <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="caption" color="textSecondary">
                                      <FormattedMessage id="entry" defaultMessage="Entry" />
                                    </Typography>
                                    <Typography 
                                      variant="caption" 
                                      fontWeight={600}
                                      sx={{ color: theme.palette.text.primary }}
                                    >
                                      {game.entryFormatted}
                                    </Typography>
                                  </Stack>
                                  
                                  <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="caption" color="textSecondary">
                                      <FormattedMessage id="duration" defaultMessage="Duration" />
                                    </Typography>
                                    <Typography 
                                      variant="caption" 
                                      fontWeight={600}
                                      sx={{ color: theme.palette.text.primary }}
                                    >
                                      {game.durationFormatted}
                                    </Typography>
                                  </Stack>
                                  
                                  <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="caption" color="textSecondary">
                                      <FormattedMessage id="players" defaultMessage="Players" />
                                    </Typography>
                                    <Typography 
                                      variant="caption" 
                                      fontWeight={600}
                                      sx={{ color: theme.palette.text.primary }}
                                    >
                                      {game.currentPlayers}/{game.numPlayers}
                                    </Typography>
                                  </Stack>
                                  
                                  <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="caption" color="textSecondary">
                                      <FormattedMessage id="coins" defaultMessage="Coins" />
                                    </Typography>
                                    <Typography 
                                      variant="caption" 
                                      fontWeight={600}
                                      sx={{ color: theme.palette.text.primary }}
                                    >
                                      {game.numCoins}
                                    </Typography>
                                  </Stack>
                                  
                                  {game.availableSlots > 0 && (
                                    <Stack direction="row" justifyContent="space-between">
                                      <Typography variant="caption" color="textSecondary">
                                        <FormattedMessage id="available.slots" defaultMessage="Available" />
                                      </Typography>
                                      <Typography variant="caption" fontWeight={600} color="success.main">
                                        <FormattedMessage
                                          id="chat.game.available.slots.count"
                                          defaultMessage="{count} {count, plural, one {slot} other {slots}}"
                                          values={{ count: game.availableSlots }}
                                        />
                                      </Typography>
                                    </Stack>
                                  )}
                                </Stack>
                                
                                <Button
                                  variant="contained"
                                  size="small"
                                  fullWidth
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectGame();
                                  }}
                                  disabled={isSelectingGame || isLoading || isJoiningGame}
                                  sx={{ mt: 1 }}
                                >
                                  <FormattedMessage id="join.game" defaultMessage="Join Game" />
                                </Button>
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
          {messages
            .filter((message) => message.id.startsWith('join-start'))
            .map((message) => (
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
                    justifyContent: 'flex-start',
                  }}
                >
                  <Paper
                    elevation={2}
                    sx={(theme) => ({
                      p: 2,
                      maxWidth: '80%',
                      borderRadius: 2,
                      backgroundColor: theme.palette.mode === 'dark'
                        ? theme.palette.grey[800]
                        : theme.palette.grey[100],
                      color: theme.palette.text.primary,
                    })}
                  >
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.content}
                    </Typography>
                  </Paper>
                </Box>
              </motion.div>
            ))}
          {messages
            .filter((msg) => msg.tokenPerformanceData && msg.tokenPerformanceData.tokens && msg.tokenPerformanceData.tokens.length > 0)
            .map((msg) => (
              <React.Fragment key={`token-msg-${msg.id}`}>
                {msg.content && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'flex-start',
                        mb: 1,
                      }}
                    >
                      <Paper
                        elevation={2}
                        sx={(theme) => ({
                          p: 2,
                          maxWidth: '80%',
                          borderRadius: 2,
                          backgroundColor:
                            theme.palette.mode === 'dark'
                              ? theme.palette.grey[800]
                              : theme.palette.grey[100],
                          color: theme.palette.text.primary,
                        })}
                      >
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                          {msg.content}
                        </Typography>
                      </Paper>
                    </Box>
                  </motion.div>
                )}
                
                <motion.div
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
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      mb: 1.5, 
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                    }}
                  >
                    <FormattedMessage
                      id="available.tokens"
                      defaultMessage="Available Tokens"
                    />
                  </Typography>
                  
                  <Box sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                      value={msg.tokenPerformanceData.timePeriod || '24h'}
                      onChange={(e, newValue) => {
                        const fetchTimeframeData = async (timeframe: string) => {
                          try {
                            const finalChainId = chainId || accountChainId;
                            if (!finalChainId) return;

                            const analysisResponse = await fetch('/api/analyze-tokens', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                text: `Show me all available tokens with their performance data and price analysis for the last ${timeframe}`,
                                chainId: finalChainId,
                              }),
                            });

                            if (analysisResponse.ok) {
                              const analysisData = await analysisResponse.json();
                              if (analysisData && analysisData.tokens && Array.isArray(analysisData.tokens) && analysisData.tokens.length > 0) {
                                setMessages((prev) =>
                                  prev.map((m) =>
                                    m.id === msg.id
                                      ? {
                                          ...m,
                                          tokenPerformanceData: {
                                            tokens: analysisData.tokens,
                                            timePeriod: timeframe,
                                          },
                                        }
                                      : m
                                  )
                                );
                              }
                            }
                          } catch (error) {
                          }
                        };

                        fetchTimeframeData(newValue);
                      }}
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{
                        minHeight: 40,
                        '& .MuiTab-root': {
                          minHeight: 40,
                          fontSize: '0.75rem',
                          textTransform: 'none',
                        },
                      }}
                    >
                      <Tab label="20m" value="20m" />
                      <Tab label="1h" value="1h" />
                      <Tab label="24h" value="24h" />
                      <Tab label="7d" value="7d" />
                      <Tab label="30d" value="30d" />
                    </Tabs>
                  </Box>

                  <Typography variant="caption" color="textSecondary" sx={{ mb: 1.5, display: 'block' }}>
                    <FormattedMessage
                                      id="token.performance.period"
                      defaultMessage="Performance in the last {timePeriod}"
                                      values={{ timePeriod: msg.tokenPerformanceData.timePeriod || '24h' }}
                    />
                  </Typography>
                  
                  <Box
                    sx={{
                      maxHeight: '400px',
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
                        
                        const isInJoinFlow = gameJoinState?.gameId !== undefined;
                        
                        const selectedCoinsInFlow = isInJoinFlow 
                          ? (gameJoinState?.selectedCoins || [])
                          : (gameCreationState?.selectedCoins || []);
                        const captainCoinInFlow = isInJoinFlow
                          ? gameJoinState?.captainCoin
                          : (gameCreationState?.selectedCoins?.[0] || undefined);
                        
                        const isSelected = captainCoinInFlow === token.symbol ||
                          selectedCoinsInFlow.includes(token.symbol);
                        const isCaptainCoin = captainCoinInFlow === token.symbol;
                        const isInActiveFlow = isInJoinFlow || hasGameCreationContext;

                        const handleTokenClick = async () => {
                          if (!isInActiveFlow) return;
                          
                          if (isSelectingToken || isLoading || isJoiningGame) {
                            return;
                          }

                          if (isSelected) {
                            return;
                          }
                          
                          setIsSelectingToken(true);

                          const userMessage: Message = {
                            id: `user-${Date.now()}`,
                            role: 'user',
                            content: token.symbol,
                            timestamp: new Date(),
                          };
                          setMessages((prev) => [...prev, userMessage]);

                          setTimeout(() => {
                            scrollToBottom();
                          }, 100);

                          if (isInJoinFlow) {
                          const currentState = gameJoinState || {};
                          let updatedState: typeof gameJoinState = { ...currentState };

                          const maxCoinsNum = typeof currentState.maxCoins === 'string' 
                            ? parseInt(currentState.maxCoins, 10) 
                            : (currentState.maxCoins || 2);

                          if (!currentState?.captainCoin) {
                            updatedState.captainCoin = token.symbol;
                            updatedState.selectedCoins = [];
                            updatedState.maxCoins = maxCoinsNum;
                          } else {
                            const requiredCoins = maxCoinsNum - 1;
                            const currentSelected = currentState.selectedCoins || [];
                            
                            if (!currentSelected.includes(token.symbol) && currentSelected.length < requiredCoins) {
                              updatedState.selectedCoins = [...currentSelected, token.symbol];
                              updatedState.maxCoins = maxCoinsNum;
                            } else {
                                setIsSelectingToken(false);
                              return;
                            }
                          }

                          setGameJoinState(updatedState);

                          setTimeout(async () => {
                            await generateAIResponse(token.symbol, undefined, updatedState);
                          }, 50);
                          } else if (hasGameCreationContext) {
                            const currentSelectedCoins = gameCreationState?.selectedCoins || [];
                            const maxCoinsNum = gameCreationState?.maxCoins || 2;
                            
                            let updatedSelectedCoins: string[] = [];
                            
                            if (currentSelectedCoins.length === 0) {
                              updatedSelectedCoins = [token.symbol];
                            } else {
                              const requiredCoins = maxCoinsNum - 1;
                              if (!currentSelectedCoins.includes(token.symbol) && currentSelectedCoins.length < maxCoinsNum) {
                                updatedSelectedCoins = [...currentSelectedCoins, token.symbol];
                              } else {
                                setIsSelectingToken(false);
                                return;
                              }
                            }

                            setGameCreationState((prev) => ({
                              ...prev,
                              selectedCoins: updatedSelectedCoins,
                            }));

                            setTimeout(async () => {
                              await generateAIResponse(token.symbol);
                            }, 50);
                          }
                        };

                        return (
                          <Grid item xs={6} sm={4} md={3} key={token.address}>
                            <Paper
                              elevation={isSelected ? 3 : 1}
                              onClick={isInActiveFlow && !isSelectingToken && !isLoading && !isJoiningGame && !isCreatingGame ? handleTokenClick : undefined}
                              sx={(theme) => ({
                                p: 1,
                                borderRadius: 1.5,
                                backgroundColor: isSelected
                                  ? (isCaptainCoin
                                      ? theme.palette.primary.main + '20'
                                      : theme.palette.secondary.main + '20')
                                  : theme.palette.background.paper,
                                border: isSelected
                                  ? `2px solid ${isCaptainCoin ? theme.palette.primary.main : theme.palette.secondary.main}`
                                  : `1px solid ${theme.palette.divider}`,
                                transition: 'all 0.2s',
                                cursor: (isInActiveFlow && !isSelectingToken && !isLoading && !isJoiningGame && !isCreatingGame) ? 'pointer' : 'default',
                                position: 'relative',
                                opacity: (isSelectingToken || isLoading || isJoiningGame || isCreatingGame) ? 0.6 : 1,
                                pointerEvents: (isSelectingToken || isLoading || isJoiningGame || isCreatingGame) ? 'none' : 'auto',
                                '&:hover': (isInActiveFlow && !isSelectingToken && !isLoading && !isJoiningGame && !isCreatingGame) ? {
                                  borderColor: theme.palette.primary.main,
                                  boxShadow: `0 2px 8px ${theme.palette.primary.main}40`,
                                  transform: 'translateY(-2px)',
                                } : {},
                              })}
                            >
                              {isSelected && (
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: 4,
                                    right: 4,
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    backgroundColor: isCaptainCoin
                                      ? theme.palette.primary.main
                                      : theme.palette.secondary.main,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 1,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: '#fff',
                                      fontSize: '0.7rem',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    {isCaptainCoin ? 'C' : '✓'}
                                  </Typography>
                                </Box>
                              )}
                              <Stack direction="row" spacing={1} alignItems="center">
                                {token.logo ? (
                                  <Avatar
                                    src={token.logo}
                                    alt={token.symbol}
                                    sx={{
                                      width: 32,
                                      height: 32,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {token.symbol.substring(0, 2).toUpperCase()}
                                  </Avatar>
                                ) : (
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
                                    <Typography 
                                      variant="caption" 
                                      fontWeight="bold" 
                                      fontSize="0.65rem"
                                      sx={{
                                        color: theme.palette.text.primary,
                                      }}
                                    >
                                    {token.symbol.substring(0, 2).toUpperCase()}
                                  </Typography>
                                </Box>
                                )}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography 
                                    variant="caption" 
                                    fontWeight={600} 
                                    noWrap 
                                    sx={{ 
                                      display: 'block',
                                      color: theme.palette.text.primary,
                                    }}
                                  >
                                    {token.symbol}
                                  </Typography>
                                  <Typography 
                                    variant="caption" 
                                    color="textSecondary" 
                                    fontSize="0.7rem" 
                                    noWrap 
                                    sx={{ 
                                      display: 'block',
                                      color: theme.palette.text.secondary,
                                    }}
                                  >
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
                                    <Typography 
                                      variant="caption" 
                                      fontWeight={600} 
                                      fontSize="0.7rem"
                                      sx={{
                                        color:
                                          token.priceChangePercent >= 0
                                            ? theme.palette.success.main
                                            : theme.palette.error.main,
                                      }}
                                    >
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
              </React.Fragment>
            ))}
            {/* Render confirmation messages after all analysis tables */}
            <AnimatePresence>
              {(() => {
                const confirmationMessages = messages.filter((message) => 
                  message.isConfirmationMessage && 
                  message.gameJoinState &&
                  !message.id.startsWith('join-start') && 
                  !message.id.startsWith('token-analysis')
                );
                return confirmationMessages;
              })()
                .map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                      <Paper
                        elevation={3}
                        sx={(theme) => ({
                          p: 3,
                          maxWidth: '90%',
                          borderRadius: 2,
                          backgroundColor: theme.palette.mode === 'dark'
                            ? theme.palette.grey[800]
                            : theme.palette.grey[50],
                          border: `2px solid ${theme.palette.primary.main}`,
                          color: theme.palette.text.primary,
                        })}
                      >
                        <Typography 
                          variant="body1" 
                          sx={(theme) => ({ 
                            whiteSpace: 'pre-wrap', 
                            mb: 2,
                            color: theme.palette.text.primary,
                          })}
                        >
                          {message.content}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                          <Button
                            variant="outlined"
                            color="secondary"
                            onClick={async () => {
                              if (message.gameJoinState) {
                                const resetState = {
                                  gameId: message.gameJoinState.gameId,
                                  chainId: message.gameJoinState.chainId,
                                  maxCoins: message.gameJoinState.maxCoins,
                                  captainCoin: undefined,
                                  selectedCoins: [],
                                };
                                setGameJoinState(resetState);

                                const editMessage: Message = {
                                  id: `edit-${Date.now()}`,
                                  role: 'assistant',
                                  content: formatMessage({
                                    id: 'chat.edit.selection',
                                    defaultMessage: 'No problem! Let\'s start over. Please select your captain coin again.',
                                  }),
                                  timestamp: new Date(),
                                };
                                setMessages((prev) => {
                                  const filtered = prev.filter((msg) => !msg.isConfirmationMessage);
                                  return [...filtered, editMessage];
                                });

                                const finalChainId = chainId || accountChainId;
                                if (finalChainId) {
                                  const fetchTokenAnalysis = async () => {
                                    try {
                                      const analysisResponse = await fetch('/api/analyze-tokens', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                          text: 'Show me all available tokens with their performance data and price analysis for the last 24 hours. I need to see all tokens with their current prices and price changes.',
                                          chainId: finalChainId,
                                        }),
                                      });


                                      if (analysisResponse.ok) {
                                        const analysisData = await analysisResponse.json();

                                        if (analysisData && analysisData.tokens && Array.isArray(analysisData.tokens) && analysisData.tokens.length > 0) {
                                          const tokenAnalysisMessage: Message = {
                                            id: `token-analysis-${Date.now()}`,
                                            role: 'assistant',
                                            content: formatMessage({
                                              id: 'chat.token.analysis.available',
                                              defaultMessage: 'Here are the available tokens with their performance data to help you choose:',
                                            }),
                                            timestamp: new Date(),
                                            tokenPerformanceData: {
                                              tokens: analysisData.tokens,
                                              timePeriod: analysisData.timePeriod || '24h',
                                            },
                                          };
                                          setMessages((prev) => {
                                            const updated = [...prev, tokenAnalysisMessage];
                                            return updated;
                                          });
                                          setTimeout(() => {
                                            scrollToBottom();
                                          }, 300);
                                        } else {
                                        }
                                      } else {
                                        const errorText = await analysisResponse.text();
                                      }
                                    } catch (error) {
                                    }
                                  };

                                  fetchTokenAnalysis();
                                } else {
                                }
                              }
                            }}
                          >
                            <FormattedMessage
                              id="chat.button.edit"
                              defaultMessage="Edit"
                            />
                          </Button>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={async () => {
                              if (message.gameJoinState) {
                                setGameJoinState(message.gameJoinState);
                                await executeJoinGame();
                              }
                            }}
                            disabled={isJoiningGame || isLoading}
                          >
                            <FormattedMessage
                              id="chat.button.confirm"
                              defaultMessage="Confirm"
                            />
                          </Button>
                        </Box>
                      </Paper>
                    </Box>
                  </motion.div>
                ))}
            </AnimatePresence>
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

