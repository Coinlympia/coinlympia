import axios from 'axios';
import OpenAI from 'openai';
import { prisma } from '../../../frontend/src/lib/prisma';
import type { TokenAnalysisRequest, TokenPerformance } from '../../types';

const COINGECKO_ENDPOINT = 'https://api.coingecko.com/api/v3';
const COINGECKO_PLATFORM_ID: { [key: number]: string } = {
  137: 'polygon-pos',
  80001: 'polygon-pos',
  56: 'binance-smart-chain',
  8453: 'base',
};

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
    },
  });

  if (!availableTokens || availableTokens.length === 0) {
    throw new Error('No active tokens found in database for this chain');
  }

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

  let days = 1;

  if (timePeriod.includes('20m') || timePeriod.includes('20 minutes') || timePeriod.includes('20 minutos')) {
    days = 1;
  } else if (timePeriod.includes('1h') || timePeriod.includes('1 hour') || timePeriod.includes('1 hora')) {
    days = 1;
  } else if (timePeriod.includes('7d') || timePeriod.includes('week') || timePeriod.includes('7 days') || timePeriod.includes('7 días')) {
    days = 7;
  } else if (timePeriod.includes('30d') || timePeriod.includes('month') || timePeriod.includes('30 days') || timePeriod.includes('30 días')) {
    days = 30;
  } else if (timePeriod.includes('90d') || timePeriod.includes('3 months') || timePeriod.includes('90 days')) {
    days = 90;
  } else if (timePeriod.includes('1d') || timePeriod.includes('day') || timePeriod.includes('24h') || timePeriod.includes('24 hours') || timePeriod.includes('24 horas')) {
    days = 1;
  }

  const platformId = COINGECKO_PLATFORM_ID[chainId];

  if (!platformId) {
    throw new Error('Chain not supported for price data');
  }

  const tokenPerformances: TokenPerformance[] = [];

  for (const token of availableTokens) {
    try {
      const currentPriceResponse = await axios.get(
        `${COINGECKO_ENDPOINT}/simple/token_price/${platformId}?contract_addresses=${token.address}&vs_currencies=usd`,
        {
          timeout: 5000,
        }
      );

      const currentPrice = currentPriceResponse.data[token.address.toLowerCase()]?.usd;

      if (!currentPrice) {
        continue;
      }

      const historicalPriceResponse = await axios.get(
        `${COINGECKO_ENDPOINT}/coins/${platformId}/contract/${token.address}/market_chart?vs_currency=usd&days=${days}`,
        {
          timeout: 5000,
        }
      );

      const prices = historicalPriceResponse.data?.prices;
      if (!prices || prices.length === 0) {
        continue;
      }

      let historicalPrice: number;
      const now = Date.now();

      if (timePeriod.includes('20m') || timePeriod.includes('20 minutes') || timePeriod.includes('20 minutos')) {
        const twentyMinutesAgo = now - (20 * 60 * 1000);
        const closestPrice = prices.find((p: [number, number]) => p[0] >= twentyMinutesAgo) || prices[0];
        historicalPrice = closestPrice[1];
      } else if (timePeriod.includes('1h') || timePeriod.includes('1 hour') || timePeriod.includes('1 hora')) {
        const oneHourAgo = now - (60 * 60 * 1000);
        const closestPrice = prices.find((p: [number, number]) => p[0] >= oneHourAgo) || prices[0];
        historicalPrice = closestPrice[1];
      } else {
        historicalPrice = prices[0][1];
      }

      const priceChange = currentPrice - historicalPrice;
      const priceChangePercent = ((priceChange / historicalPrice) * 100);

      tokenPerformances.push({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        priceChange,
        priceChangePercent,
        currentPrice,
        historicalPrice,
      });
    } catch (error) {
      console.error(`Error fetching data for token ${token.symbol}:`, error);
      continue;
    }
  }

  tokenPerformances.sort((a, b) => b.priceChangePercent - a.priceChangePercent);

  return {
    tokens: tokenPerformances,
    timePeriod: timePeriod,
  };
}

