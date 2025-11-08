import OpenAI from 'openai';
import { prisma } from '../../../frontend/src/lib/prisma';
import type { TokenAnalysisRequest, TokenPerformance } from '../../types';

export async function analyzeTokens(
  request: TokenAnalysisRequest
): Promise<{ tokens: TokenPerformance[]; timePeriod: string }> {
  const { text, chainId } = request;

  if (!text || typeof text !== 'string') {
    throw new Error('Text is required');
  }

  if (!chainId) {
    throw new Error('ChainId is required');
  }

  const availableTokens = await prisma.gameToken.findMany({
    where: {
      chainId: chainId,
      isActive: true,
    },
    select: {
      address: true,
      symbol: true,
      name: true,
      logo: true,
      currentPrice: true,
      price20m: true,
      price1h: true,
      price4h: true,
      price8h: true,
      price24h: true,
      price7d: true,
      price30d: true,
    },
  });

  if (!availableTokens || availableTokens.length === 0) {
    console.warn(`[Token Analysis Service] No active tokens found in database for chainId: ${chainId}`);
    return { tokens: [], timePeriod: '24h' };
  }

  console.log(`[Token Analysis Service] Found ${availableTokens.length} active tokens for chainId: ${chainId}`);

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  const prompt = `Analyze the following user query and determine if it is asking about token/coin performance analysis.

The user might be asking about:
- Token performance, price changes, best/worst performing tokens
- Coin analysis, market analysis, price movements
- Which tokens/coins have performed best/worst in a time period
- Token rankings, top performers, worst performers

Examples of analysis queries:
- "Which tokens have the best performance in the last 24 hours?"
- "Show me coins with best performance in the last 20 minutes"
- "What tokens performed best this week?"
- "Which coins had the worst performance last month?"

Examples of NON-analysis queries (these are about creating games):
- "Create a bull game"
- "Make a game for 10 players"
- "Bear game with 3 coins"

User query: "${text}"

Return a JSON object with:
{
  "timePeriod": "string describing the period (e.g., "20m", "1h", "24h", "7d", "30d", "1w", "1m")",
  "isAnalysisQuery": boolean (true if the query is asking for token/coin analysis/performance, false if it's about creating games)
}

IMPORTANT: If the query mentions "create", "make", "game", "players", "bull", "bear" in the context of creating a game, set isAnalysisQuery to false.
If the query mentions "performance", "best", "worst", "top", "ranking", "desempeño", "rendimiento", "mejor", "peor", "análisis", set isAnalysisQuery to true.

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

  const parsed = JSON.parse(cleanedResponse) as {
    timePeriod?: string;
    isAnalysisQuery?: boolean;
  };

  if (!parsed.isAnalysisQuery) {
    return { tokens: [], timePeriod: '24h' };
  }

  const timePeriod = parsed.timePeriod || '24h';

  const tokenPerformances: TokenPerformance[] = [];

  for (const token of availableTokens) {
    try {
      const currentPriceStr = token.currentPrice;
      if (!currentPriceStr) {
        console.warn(`[Token Analysis Service] No currentPrice for token ${token.symbol} (${token.address})`);
        continue;
      }

      const currentPrice = parseFloat(currentPriceStr);
      if (isNaN(currentPrice) || currentPrice <= 0) {
        console.warn(`[Token Analysis Service] Invalid currentPrice for token ${token.symbol}: ${currentPriceStr}`);
        continue;
      }

      let historicalPriceStr: string | null = null;
      
      if (timePeriod.includes('20m') || timePeriod.includes('20 minutes') || timePeriod.includes('20 minutos')) {
        historicalPriceStr = token.price20m;
      } else if (timePeriod.includes('1h') || timePeriod.includes('1 hour') || timePeriod.includes('1 hora')) {
        historicalPriceStr = token.price1h;
      } else if (timePeriod.includes('4h') || timePeriod.includes('4 hours') || timePeriod.includes('4 horas')) {
        historicalPriceStr = token.price4h;
      } else if (timePeriod.includes('8h') || timePeriod.includes('8 hours') || timePeriod.includes('8 horas')) {
        historicalPriceStr = token.price8h;
      } else if (timePeriod.includes('7d') || timePeriod.includes('week') || timePeriod.includes('7 days') || timePeriod.includes('7 días')) {
        historicalPriceStr = token.price7d;
      } else if (timePeriod.includes('30d') || timePeriod.includes('month') || timePeriod.includes('30 days') || timePeriod.includes('30 días')) {
        historicalPriceStr = token.price30d;
      } else {
        historicalPriceStr = token.price24h;
      }

      if (!historicalPriceStr) {
        console.warn(`[Token Analysis Service] No historical price for token ${token.symbol} for timePeriod: ${timePeriod}`);
        continue;
      }

      const historicalPrice = parseFloat(historicalPriceStr);
      if (isNaN(historicalPrice) || historicalPrice <= 0) {
        console.warn(`[Token Analysis Service] Invalid historical price for token ${token.symbol}: ${historicalPriceStr}`);
        continue;
      }

      const priceChange = currentPrice - historicalPrice;
      const priceChangePercent = ((priceChange / historicalPrice) * 100);

      tokenPerformances.push({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        logo: token.logo || null,
        priceChange,
        priceChangePercent,
        currentPrice,
        historicalPrice,
      });
    } catch (error) {
      console.error(`[Token Analysis Service] Error processing token ${token.symbol}:`, error);
      continue;
    }
  }

  tokenPerformances.sort((a, b) => b.priceChangePercent - a.priceChangePercent);

  console.log(`[Token Analysis Service] Returning ${tokenPerformances.length} tokens for timePeriod: ${timePeriod}`);

  if (tokenPerformances.length === 0) {
    console.warn('[Token Analysis Service] No token performances found. This might indicate an issue with the API calls or token data.');
  }

  return {
    tokens: tokenPerformances,
    timePeriod: timePeriod,
  };
}

