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
  parseFindGamesAction,
  parseJoinExistingGameAction,
} from '../../utils/message-processors';

export async function generateChatResponse(
  request: ChatRequest
): Promise<ChatResponse> {
  const { message, conversationHistory, tokenData, chainId, gameCreationState, gameJoinState } = request;

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

          const isInJoinFlow = gameJoinState?.gameId !== undefined;
          const hasCaptainCoin = gameJoinState?.captainCoin !== undefined;
          const selectedCoinsCount = gameJoinState?.selectedCoins?.length || 0;
          const maxCoins = typeof gameJoinState?.maxCoins === 'string' 
            ? parseInt(gameJoinState.maxCoins, 10) 
            : (gameJoinState?.maxCoins || 2);
          const requiredCoins = maxCoins - 1;
          const needsMoreCoinsInJoinFlow = isInJoinFlow && hasCaptainCoin && selectedCoinsCount < requiredCoins;

          if (isUserSelectingCoins || hasAllParamsExceptCoins || needsMoreCoinsInJoinFlow) {
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

  if (gameJoinState) {
    const joinStateInfo = Object.entries(gameJoinState)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');

    if (joinStateInfo) {
      const maxCoins = typeof gameJoinState.maxCoins === 'string' 
        ? parseInt(gameJoinState.maxCoins, 10) 
        : (gameJoinState.maxCoins || 2);
      const captainCoin = gameJoinState.captainCoin;
      const selectedCoins = gameJoinState.selectedCoins || [];
      const remainingCoinsNeeded = maxCoins - 1 - selectedCoins.length;

      systemPrompt += `\n\nCURRENT GAME JOIN STATE (user is joining an existing game):
${joinStateInfo}

The user is in the process of joining game #${gameJoinState.gameId || 'unknown'}.
Game configuration: ${maxCoins} coins total (1 captain + ${maxCoins - 1} additional coins).

CURRENT SELECTION STATUS:
- Captain Coin: ${captainCoin || 'NOT SELECTED'}
- Additional Coins Selected: ${selectedCoins.length} of ${maxCoins - 1} required
- Remaining Coins Needed: ${remainingCoinsNeeded}
- ALL COINS SELECTED: ${captainCoin && selectedCoins.length === maxCoins - 1 ? 'YES - SHOW SUMMARY NOW' : 'NO'}

CRITICAL WORKFLOW FOR JOINING A GAME:
1. STEP 1 - Captain Coin Selection:
   - If captainCoin is NOT set, you MUST ask the user to select their captain coin first.
   - Explain that the captain coin is the main token they're betting on.
   - Example: "First, I need you to select your captain coin. This is the main token you're betting on. Which token would you like to use as your captain coin?"

2. STEP 2 - Additional Coins Selection:
   - If captainCoin IS set but selectedCoins is incomplete (less than ${maxCoins - 1} coins), you MUST ask the user to select the remaining coins.
   - Tell them exactly how many more coins they need: "You need to select ${remainingCoinsNeeded} more coin(s) to complete your selection."
   - Example: "Great! You've selected ${captainCoin} as your captain coin. Now, please select ${remainingCoinsNeeded} more coin(s) from the available tokens."

3. STEP 3 - Show Summary and Ask for Confirmation:
   - CRITICAL: If "ALL COINS SELECTED: YES - SHOW SUMMARY NOW" appears above, you MUST IMMEDIATELY show the summary and ask for confirmation in your response.
   - DO NOT wait for another message from the user. When the user selects the last required coin, you MUST respond with:
     a) A clear summary of their selections:
        "Perfect! Here's your selection:
        - Captain Coin: ${captainCoin}
        - Additional Coins: ${selectedCoins.join(', ')}
        Total: ${maxCoins} coins"
     b) Ask for confirmation: "Are you ready to join the game? Please confirm by saying 'yes', 'confirm', 'listo', 'ready', 'unirse', or 'join'. If you want to change your selection, just say 'no' or 'cancel' and we'll start over."
   - IMPORTANT: Check the "ALL COINS SELECTED" status above. If it says "YES - SHOW SUMMARY NOW", you MUST show the summary and ask for confirmation NOW. Do not ask for more coins.

4. STEP 4 - Handle Confirmation:
   - If user confirms (says "yes", "confirm", "listo", "ready", "unirse", "join", "sí", "confirmar"), proceed with joining.
   - If user cancels (says "no", "cancel", "cancelar", "change", "cambiar"), reset the selection and start over:
     "No problem! Let's start over. Please select your captain coin again."

IMPORTANT RULES:
- ALWAYS respond to the user's message. Never leave them without a response.
- When the user selects a coin, acknowledge it immediately: "Great! I've noted that you selected [coin]."
- Extract coin symbols/names from the user's message. Look for:
  * Token symbols (BTC, ETH, ADA, etc.)
  * Token names (Bitcoin, Ethereum, Cardano, etc.)
  * Phrases like "Bitcoin y Ethereum" = ["BTC", "ETH"]
  * Multiple tokens separated by commas, "y", "and", etc.
- Be conversational and helpful, showing token analysis data when relevant.
- Always respond in the same language the user writes to you.

CRITICAL: When the user is in the process of joining a game (gameJoinState is set):
- DO NOT respond with ACTION:FIND_GAMES. The user is already in a game and selecting tokens.
- If the user sends a token symbol (like "BTC", "ETH", "ZEC", etc.), they are SELECTING that token, not searching for games.
- Acknowledge the token selection and proceed with the workflow (ask for remaining coins if needed, or show summary if all coins are selected).
- NEVER search for games when the user is in the middle of joining a game.

MANDATORY CHECK BEFORE RESPONDING:
1. Look at the "ALL COINS SELECTED" status in CURRENT SELECTION STATUS above.
2. If it says "YES - SHOW SUMMARY NOW", you MUST show the summary and ask for confirmation. Do NOT ask for more coins.
3. If it says "NO", check how many coins are still needed and ask for those coins.
4. Your response MUST match the current selection status.`;
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

  console.log('[Chat Service] AI Response:', {
    responseLength: responseText.length,
    responsePreview: responseText.substring(0, 200),
    gameJoinState: gameJoinState ? {
      gameId: gameJoinState.gameId,
      captainCoin: gameJoinState.captainCoin,
      selectedCoins: gameJoinState.selectedCoins,
      maxCoins: gameJoinState.maxCoins,
    } : null,
  });

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

  const findGamesResult = parseFindGamesAction(responseText);

  if (findGamesResult.hasAction && findGamesResult.findGamesParams) {
    if (gameJoinState?.gameId !== undefined) {
      console.log('[Chat Service] Ignoring find_games action during join flow');
    } else {
      return {
        response: findGamesResult.responseText || 'Searching for available games...',
        action: {
          type: 'find_games',
          findGamesParams: {
            ...findGamesResult.findGamesParams,
            chainId: findGamesResult.findGamesParams.chainId || activeChainId,
            status: findGamesResult.findGamesParams.status || 'Waiting',
            limit: findGamesResult.findGamesParams.limit || 20,
          },
        },
      };
    }
  }

  const joinGameResult = parseJoinExistingGameAction(responseText);

  if (joinGameResult.hasAction && joinGameResult.joinGameParams) {
    return {
      response: joinGameResult.responseText || 'Preparing to join the game...',
      action: {
        type: 'join_existing_game',
        joinGameParams: {
          ...joinGameResult.joinGameParams,
          chainId: joinGameResult.joinGameParams.chainId || activeChainId,
        },
      },
    };
  }

  const hasSelectedCoins = Boolean(gameCreationState?.selectedCoins && gameCreationState.selectedCoins.length > 0);
  
  const isInJoinFlow = gameJoinState?.gameId !== undefined;
  const hasCaptainCoin = gameJoinState?.captainCoin !== undefined;
  const selectedCoinsCount = gameJoinState?.selectedCoins?.length || 0;
  const maxCoins = typeof gameJoinState?.maxCoins === 'string' 
    ? parseInt(gameJoinState.maxCoins, 10) 
    : (gameJoinState?.maxCoins || 2);
  const requiredCoins = maxCoins - 1;
  const needsMoreCoins = isInJoinFlow && hasCaptainCoin && selectedCoinsCount < requiredCoins;
  
  const shouldIncludeTokenData = 
    (isAskingForCoinsInResponse(responseText, hasSelectedCoins) || needsMoreCoins) && 
    tokenPerformanceData;

  return {
    response: responseText,
    ...(shouldIncludeTokenData && { tokenPerformanceData }),
  };
}

