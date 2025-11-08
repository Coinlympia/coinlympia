import OpenAI from 'openai';
import type { GameParams } from '../../types';

export async function parseGameRequest(text: string): Promise<GameParams> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  const prompt = `You are a game parameter extractor. Extract game parameters from the following user request or conversation in natural language.

The user wants to create a game with the following possible parameters:
- gameType: "bull" or "bear" (default: "bull")
- duration: duration in seconds. Convert time units to seconds:
  * 1 hour = 3600
  * 4 hours = 14400
  * 8 hours = 28800
  * 24 hours = 86400
  * 1 day = 86400
  * 1 week = 604800
- gameLevel: number representing game level. Levels: 1 = Beginner, 2 = Intermediate, 3 = Advanced, 4 = Expert, 5 = Master, 6 = GrandMaster
- maxCoins: number of coins including captain coin (minimum: 2)
- maxPlayers: number of players (common values: 2, 3, 5, 10, 25, 50)

Extract ALL parameters mentioned in the conversation, even if they appear in different messages. Look through the entire conversation to find all mentioned parameters.

IMPORTANT: When extracting maxPlayers, look for:
- Numbers followed by "jugadores", "players", "personas", "people"
- Phrases like "para dos jugadores" = 2, "for 10 players" = 10, "para 5 personas" = 5
- Numbers in the context of player count: "2 jugadores" = 2, "ten players" = 10

Conversation: "${text}"

Return a JSON object with all parameters that were mentioned in the conversation. Use this exact format:
{
  "gameType": "bull" or "bear" (only if mentioned),
  "duration": number in seconds (only if mentioned, convert minutes/hours to seconds),
  "gameLevel": number 1-6 (only if mentioned),
  "maxCoins": number (only if mentioned),
  "maxPlayers": number (only if mentioned),
  "selectedCoins": array of token symbols/names (only if mentioned, e.g., ["BTC", "ETH", "ADA"])
}

IMPORTANT: When extracting selectedCoins, look for:
- Token symbols (BTC, ETH, ADA, USDT, etc.)
- Token names (Bitcoin, Ethereum, Cardano, Tether, etc.)
- Phrases like "Bitcoin y Ethereum" = ["BTC", "ETH"]
- Phrases like "BTC and ETH" = ["BTC", "ETH"]
- Multiple tokens separated by commas, "y", "and", etc.
- Map common token names to their symbols:
  * Bitcoin -> BTC
  * Ethereum -> ETH
  * Cardano -> ADA
  * Tether -> USDT
  * Polygon -> MATIC
  * Chainlink -> LINK
  * etc.

Example responses:
- "Create a bull game for 10 players" -> {"gameType": "bull", "maxPlayers": 10}
- "Bear game with 3 coins" -> {"gameType": "bear", "maxCoins": 3}
- "10 player game lasting 4 hours" -> {"maxPlayers": 10, "duration": 14400}
- "Bull game for 2 players of 5 minutes" -> {"gameType": "bull", "maxPlayers": 2, "duration": 300}
- "crea un juego bear para dos jugadores" -> {"gameType": "bear", "maxPlayers": 2}
- "Bull game" -> {"gameType": "bull"}

IMPORTANT: Convert time units to seconds. If user says "5 minutes", return 300. If user says "1 hour", return 3600.
IMPORTANT: Extract player count from phrases like "para dos jugadores", "for two players", "para 10 jugadores", etc.

Return only valid JSON, no additional text.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a JSON-only response assistant. Return only valid JSON objects.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 200,
  });

  const responseText = completion.choices[0]?.message?.content?.trim();

  if (!responseText) {
    throw new Error('No response from OpenAI');
  }

  let cleanedResponse = responseText;
  if (responseText.startsWith('```json')) {
    cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (responseText.startsWith('```')) {
    cleanedResponse = responseText.replace(/```\n?/g, '');
  }

  const parsedParams = JSON.parse(cleanedResponse) as GameParams;

  const validatedParams: GameParams = {};

  if (parsedParams.gameType) {
    validatedParams.gameType = parsedParams.gameType.toLowerCase() === 'bear' ? 'bear' : 'bull';
  }

  if (parsedParams.duration && typeof parsedParams.duration === 'number' && parsedParams.duration > 0) {
    validatedParams.duration = parsedParams.duration;
  }

  if (parsedParams.gameLevel !== undefined && typeof parsedParams.gameLevel === 'number' && parsedParams.gameLevel >= 1 && parsedParams.gameLevel <= 6) {
    validatedParams.gameLevel = parsedParams.gameLevel;
  }

  if (parsedParams.maxCoins && typeof parsedParams.maxCoins === 'number' && parsedParams.maxCoins >= 2) {
    validatedParams.maxCoins = parsedParams.maxCoins;
  }

  if (parsedParams.maxPlayers && typeof parsedParams.maxPlayers === 'number' && parsedParams.maxPlayers > 0) {
    validatedParams.maxPlayers = parsedParams.maxPlayers;
  }

  if (parsedParams.selectedCoins && Array.isArray(parsedParams.selectedCoins) && parsedParams.selectedCoins.length > 0) {
    validatedParams.selectedCoins = parsedParams.selectedCoins.map((coin: any) => {
      const coinStr = String(coin).trim().toUpperCase();
      return coinStr;
    });
  }

  return validatedParams;
}

