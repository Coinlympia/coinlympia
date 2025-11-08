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
  Dialog,
  DialogContent,
  DialogProps,
  Divider,
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
      console.log('Processing tokens (symbols or addresses):', symbolsOrAddresses, 'chainId:', chainId);
      const addresses: string[] = [];
      const symbols: string[] = [];

      for (const item of symbolsOrAddresses) {
        if (item.startsWith('0x') && item.length === 42) {
          console.log(`Item is already an address: ${item}`);
          addresses.push(item);
        } else {
          console.log(`Item is a symbol: ${item}`);
          symbols.push(item);
        }
      }

      if (symbols.length === 0 && addresses.length === symbolsOrAddresses.length) {
        console.log('All items are addresses, using them directly');
        const captainCoin = addresses[0];
        const coinFeeds = addresses.slice(1);
        console.log('Token addresses (direct):', { captainCoin, coinFeeds });
        return { captainCoin, coinFeeds };
      }

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
        console.log('Regenerating response with token data that arrived late');
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
            console.error('Error fetching token analysis:', error);
          }
        }
      }

      if (tokenData && tokenData.tokens && tokenData.tokens.length > 0) {
        console.log('Sending token data to API:', {
          tokenCount: tokenData.tokens.length,
          timePeriod: tokenData.timePeriod,
          topTokens: tokenData.tokens.slice(0, 3).map(t => ({ symbol: t.symbol, percent: t.priceChangePercent }))
        });
      } else {
        console.log('No token data available for API call');
      }

      const hasGameJoinContext = currentGameJoinState?.gameId !== undefined;

      let updatedGameCreationState = { ...gameCreationState };
      let updatedGameJoinState = { ...currentGameJoinState };

      if (hasGameJoinContext) {
        if (overrideGameJoinState !== undefined) {
          updatedGameJoinState = overrideGameJoinState;
          console.log('[ChatBox] Using override gameJoinState:', updatedGameJoinState);
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
                console.log('[ChatBox] Token is already the captain coin, skipping state update');
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
                console.error('Error parsing coin selections:', error);
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
          updatedGameCreationState = {
            ...updatedGameCreationState,
            ...(parsedParams.gameType && { gameType: parsedParams.gameType }),
            ...(parsedParams.duration && { duration: parsedParams.duration }),
            ...(parsedParams.gameLevel !== undefined && { gameLevel: parsedParams.gameLevel }),
            ...(parsedParams.maxCoins && { maxCoins: parsedParams.maxCoins }),
            ...(parsedParams.maxPlayers && { maxPlayers: parsedParams.maxPlayers }),
            ...(updatedGameCreationState.startDate === undefined && { startDate: Date.now() }),
          };

          setGameCreationState(updatedGameCreationState);
        }
      } catch (error) {
        console.error('Error parsing game parameters:', error);
      }
      }

      if (hasGameJoinContext) {
        setGameJoinState(updatedGameJoinState);
      }

      console.log('[ChatBox] Sending request to backend:', {
        userMessage,
        hasGameJoinContext,
        gameJoinState: updatedGameJoinState,
        captainCoin: updatedGameJoinState?.captainCoin,
        selectedCoins: updatedGameJoinState?.selectedCoins,
      });

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
        console.error('[ChatBox] API response not OK:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(errorData.error || errorData.message || 'Failed to get AI response');
      }

      const data = await response.json();

      if (!data || !data.response) {
        console.error('[ChatBox] Missing response in data:', data);
      }

      console.log('[ChatBox] AI Response received:', {
        hasResponse: !!data.response,
        responseLength: data.response?.length || 0,
        responsePreview: data.response?.substring(0, 200) || '',
        hasAction: !!data.action,
        actionType: data.action?.type,
        gameJoinState: updatedGameJoinState,
        captainCoin: updatedGameJoinState?.captainCoin,
        selectedCoins: updatedGameJoinState?.selectedCoins,
        maxCoins: updatedGameJoinState?.maxCoins,
      });

      if (data.action && data.action.type === 'create_game' && data.action.gameParams) {
        await handleCreateGame(data.action.gameParams);
        return;
      }

      if (data.action && data.action.type === 'find_games' && data.action.findGamesParams && !hasGameJoinContext) {
        await handleFindGames(data.action.findGamesParams);
        return;
      }
      
      if (data.action && data.action.type === 'find_games' && hasGameJoinContext) {
        console.log('[ChatBox] Ignoring find_games action during join flow, showing AI response instead');
      }

      if (data.action && data.action.type === 'join_existing_game' && data.action.joinGameParams) {
        await handleJoinExistingGame(data.action.joinGameParams);
        return;
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
          return;
        }
      }

      if (!data.response || typeof data.response !== 'string' || data.response.trim().length === 0) {
        console.error('[ChatBox] No valid response from AI:', data);
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
        return;
      }

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
            console.error('[ChatBox] Error fetching token analysis for remaining coins:', error);
          }
        }
      }

      const assistantMessage: Message = {
        id: messageId,
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
        isTyping: false,
        tokenPerformanceData: tokenDataForMessage,
      };

      console.log('[ChatBox] Creating assistant message:', {
        messageId,
        contentLength: fullContent.length,
        contentPreview: fullContent.substring(0, 100),
        hasTokenData: !!tokenDataForMessage,
      });

      setMessages((prev) => {
        const updated = [...prev, assistantMessage];
        console.log('[ChatBox] Messages after adding assistant message:', {
          totalMessages: updated.length,
          lastMessageId: updated[updated.length - 1]?.id,
          lastMessageContent: updated[updated.length - 1]?.content?.substring(0, 50) || '',
        });
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
      
      setIsSelectingToken(false);
    } catch (error) {
      console.error('Error generating AI response:', error);
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

        if (!createGameReceipt) {
          throw new Error('Transaction receipt is null - transaction may have failed');
        }

        console.log('Game creation transaction receipt received:', {
          transactionHash: createGameReceipt.transactionHash,
          status: createGameReceipt.status,
          blockNumber: createGameReceipt.blockNumber,
          confirmations: createGameReceipt.confirmations,
        });

        if (createGameReceipt.status !== 1) {
          throw new Error(`Transaction failed with status ${createGameReceipt.status}. Transaction hash: ${createGameReceipt.transactionHash}`);
        }

        if (!createGameReceipt.transactionHash || createGameReceipt.transactionHash.length !== 66) {
          throw new Error(`Invalid transaction hash: ${createGameReceipt.transactionHash}`);
        }

        console.log('Game creation transaction confirmed successfully:', createGameReceipt.transactionHash);

        console.log('Waiting for blockchain to process game creation...');
        await new Promise(resolve => setTimeout(resolve, 3000));

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

        await new Promise(resolve => setTimeout(resolve, 8000));
      } catch (serverError: any) {
        console.error('Error creating game on server:', serverError);
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

      console.log('Waiting before joining game to ensure game is fully processed...');
      await new Promise(resolve => setTimeout(resolve, 5000));

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

          console.log('Validating join game data with backend service...');
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
            console.log('Join game data validated successfully:', validatedJoinData);
          } catch (validationError: any) {
            console.error('Error validating join game data:', validationError);
            throw new Error(`Failed to validate join game data: ${validationError.message || 'Unknown error'}`);
          }

          const checksummedCaptainCoin = validatedJoinData.captainCoin;
          const checksummedFeeds = validatedJoinData.feeds;
          const gameIdString = validatedJoinData.gameId;

          console.log('Getting game data from blockchain to obtain amount_to_play...');
          const { getCoinLeagueGameOnChain } = await import('../services/coinleague');
          const gameOnChain = await getCoinLeagueGameOnChain(provider, factoryAddress, gameIdString);
          
          if (!gameOnChain || !gameOnChain.amount_to_play) {
            throw new Error('Could not get game data from blockchain. Please try again.');
          }

          const amountToPlay = BigNumber.from(gameOnChain.amount_to_play);
          console.log('Game amount_to_play:', amountToPlay.toString());

          console.log('Final joinGame params (from backend service):', {
            factoryAddress,
            feeds: checksummedFeeds,
            captainCoin: checksummedCaptainCoin,
            gameId: gameIdString,
            gameIdNumber: validatedJoinData.gameIdNumber,
            feedsCount: checksummedFeeds.length,
            maxCoins: gameParams.maxCoins,
            amountToPlay: amountToPlay.toString(),
          });

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
            console.error('Error calling joinGame:', joinError);
            console.error('Error details:', {
              message: joinError.message,
              code: joinError.code,
              data: joinError.data,
              reason: joinError.reason,
              error: joinError.error,
            });

            if (joinError.reason || joinError.message?.includes('Panic')) {
              throw new Error(`Failed to join game: ${joinError.reason || joinError.message || 'Unknown error'}. Please check that the game exists and the token addresses are valid.`);
            }
            throw joinError;
          }

          console.log('Join game transaction hash:', joinTx.hash);

          console.log('Waiting for join transaction to be confirmed...');
          const joinReceipt = await joinTx.wait();

          if (!joinReceipt) {
            throw new Error('Join transaction receipt is null - transaction may have failed');
          }

          console.log('Join game transaction receipt received:', {
            transactionHash: joinReceipt.transactionHash,
            status: joinReceipt.status,
            blockNumber: joinReceipt.blockNumber,
            confirmations: joinReceipt.confirmations,
          });

          if (joinReceipt.status !== 1) {
            throw new Error(`Join transaction failed with status ${joinReceipt.status}. Transaction hash: ${joinReceipt.transactionHash}`);
          }

          if (!joinReceipt.transactionHash || joinReceipt.transactionHash.length !== 66) {
            throw new Error(`Invalid join transaction hash: ${joinReceipt.transactionHash}`);
          }

          console.log('Join game transaction confirmed successfully:', joinReceipt.transactionHash);

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

          setIsCreatingGame(false);
          return;
        }
      } else {
        console.warn('Auto-join skipped due to missing conditions:', {
          hasTokenAddresses: !!tokenAddresses,
          hasSelectedCoins: !!gameParams.selectedCoins && gameParams.selectedCoins.length > 0,
          hasGameId: !!gameId,
          hasProvider: !!provider,
          hasSigner: !!signer,
          hasFactoryAddress: !!factoryAddress,
        });

        if (gameId) {
          const finalChainIdForNav = chainId || accountChainId;
          const networkSlug = getNetworkSlugFromChainId(finalChainIdForNav);

          if (networkSlug) {
            let errorMessage: Message;
            
            if (!gameParams.selectedCoins || gameParams.selectedCoins.length === 0) {
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
      
      const searchMessage: Message = {
        id: `searching-${Date.now()}`,
        role: 'assistant',
        content: formatMessage({
          id: 'chat.searching.games',
          defaultMessage: 'Searching for available games...',
        }),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, searchMessage]);

      const finalChainId = findGamesParams.chainId || chainId || accountChainId;
      
      const response = await fetch('/api/find-games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...findGamesParams,
          chainId: finalChainId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Backend request failed' }));
        console.error('Find games error response:', errorData);
        throw new Error(errorData.error || `Failed to find games: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Find games result:', result);
      
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
      console.error('Error finding games:', error);
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
        throw new Error('Could not find token addresses for selected coins');
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

      console.log('Join game transaction hash:', joinTx.hash);

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
      console.error('Error joining game:', error);
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
              {messages
                .filter((message) => 
                  !message.id.startsWith('join-start') && 
                  !message.id.startsWith('token-analysis') &&
                  (!message.tokenPerformanceData || !message.tokenPerformanceData.tokens || message.tokenPerformanceData.tokens.length === 0)
                )
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
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
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
                                  console.log('[Token Analysis] Fetching token analysis for chainId:', finalChainId);
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

                                  console.log('[Token Analysis] Response status:', analysisResponse.status);

                                  if (analysisResponse.ok) {
                                    const analysisData = await analysisResponse.json();
                                    console.log('[Token Analysis] Data received:', {
                                      hasTokens: !!analysisData.tokens,
                                      tokenCount: analysisData.tokens?.length || 0,
                                      timePeriod: analysisData.timePeriod,
                                      fullData: JSON.stringify(analysisData, null, 2),
                                    });

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
                                      console.log('[Token Analysis] Adding message to chat:', {
                                        messageId: tokenAnalysisMessage.id,
                                        tokenCount: tokenAnalysisMessage.tokenPerformanceData?.tokens?.length || 0,
                                      });
                                      setMessages((prev) => {
                                        const updated = [...prev, tokenAnalysisMessage];
                                        console.log('[Token Analysis] Messages updated, total messages:', updated.length);
                                        return updated;
                                      });
                                      setTimeout(() => {
                                        scrollToBottom();
                                      }, 300);
                                    } else {
                                      console.error('[Token Analysis] No tokens in analysis data:', {
                                        tokens: analysisData.tokens,
                                        isArray: Array.isArray(analysisData.tokens),
                                        length: analysisData.tokens?.length,
                                      });
                                    }
                                  } else {
                                    const errorText = await analysisResponse.text();
                                    console.error('[Token Analysis] Response failed:', {
                                      status: analysisResponse.status,
                                      statusText: analysisResponse.statusText,
                                      error: errorText,
                                    });
                                  }
                                } catch (error) {
                                  console.error('[Token Analysis] Error fetching token analysis:', error);
                                }
                              };

                              fetchTokenAnalysis();
                            } else {
                              console.warn('[Token Analysis] No chainId available, skipping token analysis');
                            }
                          } catch (error: any) {
                            console.error('Error starting join flow:', error);
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
                                cursor: 'pointer',
                                '&:hover': {
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
                                    Sala #{game.id}
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
                                        {game.availableSlots} {game.availableSlots === 1 ? 'slot' : 'slots'}
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
                            console.error('[Token Analysis] Error fetching timeframe data:', error);
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

                        const isSelected = gameJoinState?.captainCoin === token.symbol ||
                          gameJoinState?.selectedCoins?.includes(token.symbol);
                        const isCaptainCoin = gameJoinState?.captainCoin === token.symbol;
                        const isInJoinFlow = gameJoinState?.gameId !== undefined;

                        const handleTokenClick = async () => {
                          if (!isInJoinFlow) return;
                          
                          // Block clicks while processing a selection
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
                              return;
                            }
                          }

                          setGameJoinState(updatedState);

                          setTimeout(async () => {
                            await generateAIResponse(token.symbol, undefined, updatedState);
                          }, 50);
                        };

                        return (
                          <Grid item xs={6} sm={4} md={3} key={token.address}>
                            <Paper
                              elevation={isSelected ? 3 : 1}
                              onClick={isInJoinFlow && !isSelectingToken && !isLoading && !isJoiningGame ? handleTokenClick : undefined}
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
                                cursor: (isInJoinFlow && !isSelectingToken && !isLoading && !isJoiningGame) ? 'pointer' : 'default',
                                position: 'relative',
                                opacity: (isSelectingToken || isLoading || isJoiningGame) ? 0.6 : 1,
                                pointerEvents: (isSelectingToken || isLoading || isJoiningGame) ? 'none' : 'auto',
                                '&:hover': (isInJoinFlow && !isSelectingToken && !isLoading && !isJoiningGame) ? {
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

