import OpenAI from 'openai';
import { StableCoinToPlay } from '../../../frontend/src/modules/coinleague/constants';
import { GameLevel } from '../../../frontend/src/modules/coinleague/constants/enums';
import { GET_GAME_LEVEL_AMOUNTS } from '../../../frontend/src/modules/coinleague/utils/game';
import { ChainId } from '../../../frontend/src/modules/common/constants/enums';
import { ethers } from 'ethers';
import type { ChatRequest, ChatResponse } from '../../types';
import { queryDatabase } from '../database/query-service';
import { buildSystemPrompt } from '../../utils/prompt-builders';
import {
  parseGameCreationAction,
  validateGameParams,
  mapCoinSymbolsToAddresses,
  isAskingForCoinsInResponse,
} from '../../utils/message-processors';

export async function generateChatResponse(
  request: ChatRequest
): Promise<ChatResponse> {
  const { message, conversationHistory, tokenData, chainId, gameCreationState } = request;

  if (!message || typeof message !== 'string') {
    throw new Error('Message is required');
  }

  const activeChainId = (chainId || tokenData?.chainId || ChainId.Polygon) as ChainId;
  const stableCoin = StableCoinToPlay[activeChainId];
  const coinToPlayAddress = stableCoin?.address || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
  const coinToPlaySymbol = stableCoin?.symbol || 'USDT';

  const gameLevelPrices: { level: number; name: string; price: string }[] = [];
  for (let level = 1; level <= 6; level++) {
    const amount = GET_GAME_LEVEL_AMOUNTS(level as GameLevel, activeChainId, coinToPlayAddress);
    const coinToPlay = stableCoin || { decimals: 6, symbol: coinToPlaySymbol };
    const formattedPrice = ethers.utils.formatUnits(amount, coinToPlay.decimals);
    const levelNames = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master', 'GrandMaster'];
    gameLevelPrices.push({
      level,
      name: levelNames[level - 1],
      price: `${formattedPrice} ${coinToPlaySymbol}`,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  let databaseData: any = null;
  let tokenPerformanceData: any = null;

  const messageLower = message.toLowerCase();
  const isAboutCoins = messageLower.includes('coin') || messageLower.includes('moneda') || messageLower.includes('token') ||
    messageLower.includes('seleccionar') || messageLower.includes('elegir') || messageLower.includes('choose') ||
    messageLower.includes('select') || messageLower.includes('disponible') || messageLower.includes('available');

  const conversationText = conversationHistory.map(m => m.content).join(' ') + ' ' + message;
  const isGameCreationContext = conversationText.toLowerCase().includes('crear') || conversationText.toLowerCase().includes('create') ||
    conversationText.toLowerCase().includes('juego') || conversationText.toLowerCase().includes('game');

  if (isAboutCoins || isGameCreationContext || gameCreationState) {
    try {
      const dbResponse = await queryDatabase({
        query: 'tokens coins monedas',
        context: {
          chainId: chainId || tokenData?.chainId,
          userAddress: undefined,
        },
      });

      if (dbResponse.success && dbResponse.data) {
        databaseData = dbResponse.data;

        if (databaseData.type === 'tokens' && databaseData.tokens && databaseData.tokens.length > 0) {
          const isUserSelectingCoins = messageLower.includes('select') || messageLower.includes('elegir') ||
            messageLower.includes('seleccionar') || messageLower.includes('choose') ||
            (messageLower.includes('moneda') && (messageLower.includes('seleccion') || messageLower.includes('elegir'))) ||
            (messageLower.includes('coin') && (messageLower.includes('select') || messageLower.includes('choose'))) ||
            (messageLower.includes('token') && (messageLower.includes('select') || messageLower.includes('choose')));

          const hasAllParamsExceptCoins = gameCreationState &&
            gameCreationState.gameType &&
            gameCreationState.duration &&
            gameCreationState.gameLevel !== undefined &&
            gameCreationState.maxCoins &&
            gameCreationState.maxPlayers &&
            !gameCreationState.selectedCoins;

          if (isUserSelectingCoins || hasAllParamsExceptCoins) {
            if (databaseData.tokens && databaseData.tokens.length > 0) {
              tokenPerformanceData = {
                tokens: databaseData.tokens.filter((token: any) => token.currentPrice > 0),
                timePeriod: '24h',
              };
            }
          }
        }
      }
    } catch (error) {
      console.error('Error querying database:', error);
    }
  }

  let systemPrompt = buildSystemPrompt(
    gameLevelPrices,
    coinToPlaySymbol,
    databaseData,
    tokenData || undefined
  );

  if (gameCreationState) {
    const stateInfo = Object.entries(gameCreationState)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');

    if (stateInfo) {
      systemPrompt += `\n\nCURRENT GAME CREATION STATE (information already collected):
${stateInfo}

Use this information to avoid asking for the same data again. Only ask for missing parameters.`;
    }
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: systemPrompt,
    },
  ];

  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  messages.push({
    role: 'user',
    content: message,
  });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 1500,
  });

  const responseText = completion.choices[0]?.message?.content?.trim();

  if (!responseText) {
    throw new Error('No response from OpenAI');
  }

  const actionResult = parseGameCreationAction(responseText);

  if (actionResult.hasAction && actionResult.gameParams) {
    const validation = validateGameParams(actionResult.gameParams);

    if (validation.isValid) {
      let mappedCoins = actionResult.gameParams.selectedCoins || [];

      if (databaseData && databaseData.type === 'tokens' && databaseData.tokens) {
        mappedCoins = mapCoinSymbolsToAddresses(mappedCoins, databaseData.tokens);
      }

      return {
        response: actionResult.responseText || 'Perfect! Creating the game now...',
        action: {
          type: 'create_game',
          gameParams: {
            gameType: actionResult.gameParams.gameType!,
            duration: actionResult.gameParams.duration!,
            gameLevel: actionResult.gameParams.gameLevel!,
            maxCoins: actionResult.gameParams.maxCoins!,
            maxPlayers: actionResult.gameParams.maxPlayers!,
            startDate: actionResult.gameParams.startDate!,
            selectedCoins: mappedCoins,
          },
        },
      };
    } else {
      return {
        response: actionResult.responseText || responseText,
        action: {
          type: 'ask_question',
          missingParams: validation.missingParams,
        },
      };
    }
  }

  const hasSelectedCoins = Boolean(gameCreationState?.selectedCoins && gameCreationState.selectedCoins.length > 0);
  const shouldIncludeTokenData = isAskingForCoinsInResponse(responseText, hasSelectedCoins) && tokenPerformanceData;

  return {
    response: responseText,
    ...(shouldIncludeTokenData && { tokenPerformanceData }),
  };
}

