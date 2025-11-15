import OpenAI from 'openai';
import { StableCoinToPlay, GameLevel } from '../../constants/coinleague';
import { GET_GAME_LEVEL_AMOUNTS } from '../../utils/game';
import { ChainId } from '../../constants/enums';
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
  
  if (gameCreationState && Object.keys(gameCreationState).length > 0) {
    console.log('[Chat Service] Received gameCreationState:', JSON.stringify(gameCreationState, null, 2));
  }

  if (!message || typeof message !== 'string') {
    throw new Error('Message is required');
  }

  const activeChainId = (chainId || tokenData?.chainId || ChainId.BSC) as ChainId;
  const stableCoin = StableCoinToPlay[activeChainId];
  const coinToPlayAddress = stableCoin?.address || '0x55d398326f99059fF775485246999027B3197955';
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
  const isAboutCoins = messageLower.includes('coin') || messageLower.includes('token') ||
    messageLower.includes('choose') ||
    messageLower.includes('select') || messageLower.includes('available');

  const conversationText = conversationHistory.map(m => m.content).join(' ') + ' ' + message;
  const isGameCreationContext = conversationText.toLowerCase().includes('create') ||
    conversationText.toLowerCase().includes('game');

  if (isAboutCoins || isGameCreationContext || gameCreationState) {
    try {
      const dbResponse = await queryDatabase({
        query: 'tokens coins',
        context: {
          chainId: chainId || tokenData?.chainId,
          userAddress: undefined,
        },
      });

      if (dbResponse.success && dbResponse.data) {
        databaseData = dbResponse.data;

        if (databaseData.type === 'tokens' && databaseData.tokens && databaseData.tokens.length > 0) {
          const isUserSelectingCoins = messageLower.includes('select') ||
            messageLower.includes('choose') ||
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
    tokenData || undefined,
    'english',
    message
  );

  if (gameCreationState) {
    const stateInfo = Object.entries(gameCreationState)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');

    if (stateInfo) {
      const missingParams: string[] = [];
      if (!gameCreationState.gameType) missingParams.push('gameType (bull or bear)');
      if (!gameCreationState.duration) missingParams.push('duration (in seconds)');
      if (gameCreationState.gameLevel === undefined) missingParams.push('gameLevel (1-6)');
      if (!gameCreationState.maxCoins) missingParams.push('maxCoins (2-5)');
      if (!gameCreationState.maxPlayers) missingParams.push('maxPlayers (2-20)');
      
      const stateSummary = Object.entries(gameCreationState)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
        .join('\n');
      
      systemPrompt += `\n\n=== CURRENT GAME CREATION STATE ===
The user has ALREADY provided the following information:
${stateSummary}

=== MISSING PARAMETERS ===
${missingParams.length > 0 ? missingParams.map(p => `- ${p}`).join('\n') : 'NONE - All parameters have been collected!'}

CRITICAL: Check the "CURRENT GAME CREATION STATE" above. If a parameter is listed there, it means the user has ALREADY provided it. DO NOT ask for it again. ONLY ask for parameters listed in "MISSING PARAMETERS" above.

=== CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE ===
1. DO NOT ask for ANY information that is listed above in "CURRENT GAME CREATION STATE"
2. DO NOT repeat questions about parameters that are already set
3. ONLY ask for parameters listed in "MISSING PARAMETERS" section
4. If a parameter is already in the state, acknowledge it in ONE sentence and IMMEDIATELY ask for the next missing parameter
5. CRITICAL: Before asking for ANY parameter, check the "CURRENT GAME CREATION STATE" above. If the parameter is listed there, DO NOT ask for it. It means the user has ALREADY provided it.
6. CRITICAL: If "MISSING PARAMETERS" shows "NONE - All parameters have been collected!", you MUST NOT ask for any more parameters. Instead, proceed with creating the game.

=== EXAMPLES OF CORRECT BEHAVIOR ===
Example 1: If state shows "gameType: bull" and "duration: 14400", but gameLevel is missing:
CORRECT: "Perfect! You've chosen a bull game. Now I need to know the difficulty level. What level would you like?"
WRONG: "What type of game do you want?" or "How long should the game last?" or "What level would you like? (1-6)" or mentioning specific values like "3600", "14400", etc.

Example 2: If state shows "gameType: bull", "duration: 14400", and "gameLevel: 1", but maxPlayers is missing:
CORRECT: "Great! Bull game, Level 1. How many players should the game support?"
WRONG: "What type of game?" or "How long?" or "What level?" or mentioning specific values like "2 players", "10 players", etc.

=== ABSOLUTE PROHIBITIONS ===
- If gameType is in the state, NEVER ask "What type of game?" or "Bull or Bear?"
- If duration is in the state, NEVER ask "How long should the game last?" or "What duration?"
- If gameLevel is in the state, NEVER ask "What level?" or "What difficulty?" and NEVER mention entry prices or list levels with prices
- If maxCoins is in the state, NEVER ask "How many coins?" or "How many tokens?" or "How many coins should the game support?"
- If maxPlayers is in the state, NEVER ask "How many players?" or "How many participants?" or "How many players should the game support?"

CRITICAL: When asking for gameLevel, DO NOT mention entry prices or list the levels with their prices. The user will see checkboxes with these options, so mentioning them is redundant. Just ask "What difficulty level do you prefer?" or "What level would you like?" without listing the options or prices.

=== FINAL REMINDER ===
The state above shows what the user has ALREADY told you. Do NOT ask for it again. Only ask for what is in the "MISSING PARAMETERS" list. If you ask for something that is already in the state, you are making a CRITICAL ERROR.

=== RESPONSE TEMPLATE ===
When responding, follow this format:
1. Acknowledge what is already set (if any): "Perfect! You've chosen [gameType] game..." (DO NOT mention specific values like "3600 seconds", "4 hours", "Level 1", "20 players", etc.)
2. Ask ONLY for missing parameters: "Now I need to know [missing parameter]..." (DO NOT list specific values or options in your response)
3. NEVER repeat questions about parameters that are already in the state.
4. NEVER mention specific values like "3600", "14400", "28800", "86400", "604800" (durations in seconds), "Level 1", "Level 2", etc., "2 players", "10 players", etc., "2 coins", "3 coins", etc. The user will see checkboxes with these options, so mentioning them is redundant.

CRITICAL: When asking for a parameter, DO NOT list the specific values or options. Just ask the question simply. For example:
- WRONG: "How long should the game last? Options: 1 hour (3600), 4 hours (14400), 8 hours (28800), 24 hours (86400), or 1 week (604800)."
- CORRECT: "How long should the game last?"

- WRONG: "What level would you like? (1-6)"
- CORRECT: "What level would you like?"

- WRONG: "How many players? (2, 3, 5, 10, 50)"
- CORRECT: "How many players should the game support?"

- WRONG: "How many coins? (2-5)"
- CORRECT: "How many coins should the game support?"

Example response when gameType="bear", duration=604800, gameLevel=1, maxPlayers=20 are set, but maxCoins is missing:
"Perfect! You've chosen a bear game. Now I need to know how many coins the game should support. How many coins?"

DO NOT ask about gameType, duration, gameLevel, or maxPlayers in this example because they are already set.`;
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
   - You MUST respond in English.
   - Example: "Perfect! You want to join game #${gameJoinState.gameId || 'X'}. First, I need you to select your captain coin. Please tell me which token you want to use as your captain coin."

2. STEP 2 - Additional Coins Selection:
   - If captainCoin IS set but selectedCoins is incomplete (less than ${maxCoins - 1} coins), you MUST ask the user to select the remaining coins.
   - Tell them exactly how many more coins they need.
   - You MUST respond in English.
   - Example: "Great! You've selected ${captainCoin} as your captain coin. Now, please select ${remainingCoinsNeeded} more coin(s) from the available tokens."

3. STEP 3 - Show Summary and Ask for Confirmation:
   - CRITICAL: If "ALL COINS SELECTED: YES - SHOW SUMMARY NOW" appears above, you MUST IMMEDIATELY show the summary and ask for confirmation in your response.
   - DO NOT wait for another message from the user. When the user selects the last required coin, you MUST respond with:
     a) A clear summary of their selections:
        "Perfect! Here's your selection:\n- Captain Coin: ${captainCoin}\n- Additional Coins: ${selectedCoins.join(', ')}\nTotal: ${maxCoins} coins"
     b) Ask for confirmation:
        "Are you ready to join the game? Please confirm by saying 'yes', 'confirm', 'ready', or 'join'. If you want to change your selection, just say 'no' or 'cancel' and we'll start over."
   - IMPORTANT: Check the "ALL COINS SELECTED" status above. If it says "YES - SHOW SUMMARY NOW", you MUST show the summary and ask for confirmation NOW. Do not ask for more coins.

4. STEP 4 - Handle Confirmation:
   - CRITICAL: If "ALL COINS SELECTED: YES - SHOW SUMMARY NOW" appears above AND the user confirms (says "yes", "confirm", "ready", "join"), you MUST immediately respond with ACTION:JOIN_EXISTING_GAME.
   - Format: ACTION:JOIN_EXISTING_GAME followed by JSON with gameId and chainId.
   - Example response when user says "yes" and all coins are already selected:
     "Perfect! Let's join the game now!"
     ACTION:JOIN_EXISTING_GAME
     {
       "gameId": ${gameJoinState.gameId},
       "chainId": ${gameJoinState.chainId || 56}
     }
   - If user cancels (says "no", "cancel", "change"), reset the selection and start over:
     "No problem! Let's start over. Please select your captain coin again."
   - IMPORTANT: When all coins are selected (captainCoin + selectedCoins complete) AND user confirms, you MUST generate ACTION:JOIN_EXISTING_GAME. Do NOT ask for tokens again.

IMPORTANT RULES:
- ALWAYS respond to the user's message. Never leave them without a response.
- You MUST respond in English.
- When the user selects a coin, acknowledge it immediately:
  "Great! I've noted that you selected [coin]."
- Extract coin symbols/names from the user's message. Look for:
  * Token symbols (BTC, ETH, ADA, etc.)
  * Token names (Bitcoin, Ethereum, Cardano, etc.)
  * Phrases like "Bitcoin and Ethereum" = ["BTC", "ETH"]
  * Multiple tokens separated by commas, "and", etc.
- Be conversational and helpful, showing token analysis data when relevant.

CRITICAL: When the user is in the process of joining a game (gameJoinState is set):
- DO NOT respond with ACTION:FIND_GAMES. The user is already in a game and selecting tokens.
- If the user sends a token symbol (like "BTC", "ETH", "ZEC", etc.), they are SELECTING that token, not searching for games.
- Acknowledge the token selection and proceed with the workflow (ask for remaining coins if needed, or show summary if all coins are selected).
- NEVER search for games when the user is in the middle of joining a game.

MANDATORY CHECK BEFORE RESPONDING:
1. Look at the "ALL COINS SELECTED" status in CURRENT SELECTION STATUS above.
2. If "ALL COINS SELECTED: YES - SHOW SUMMARY NOW" AND the user's message is a confirmation (contains words like "yes", "confirm", "join", "ready", "enter"), you MUST immediately respond with ACTION:JOIN_EXISTING_GAME. Do NOT show summary again, do NOT ask for confirmation again. The user has confirmed, so execute the join action.
3. If "ALL COINS SELECTED: YES - SHOW SUMMARY NOW" BUT the user has NOT confirmed yet, show the summary and ask for confirmation. Do NOT ask for more coins.
4. If it says "NO", check how many coins are still needed and ask for those coins.
5. Your response MUST match the current selection status.

CRITICAL SPECIAL CASE - User just created a game:
If the user just said "yes", "join", "confirm", or "ready" AND gameJoinState shows captainCoin is set AND selectedCoins is complete (${captainCoin && selectedCoins.length === maxCoins - 1 ? 'TRUE - this is the case RIGHT NOW' : 'FALSE'}), this means they want to join the game they just created with the tokens they already selected. You MUST respond with ACTION:JOIN_EXISTING_GAME immediately. Do NOT ask for token selection again.`;
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

