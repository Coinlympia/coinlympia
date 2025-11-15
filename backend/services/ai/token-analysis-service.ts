import OpenAI from 'openai';
import { prisma } from '../../lib/prisma';
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

  let allowedAddresses: Set<string> | null = null;
  if (chainId === 56) {
    try {
      // @ts-expect-error - Dynamic import with webpack alias, works at runtime
      const { BSCPriceFeeds } = await import('@/modules/coinleague/constants/PriceFeeds/bsc');
      allowedAddresses = new Set(BSCPriceFeeds.map((feed: any) => feed.address.toLowerCase()));
      console.log(`[Token Analysis Service] Will filter to ${allowedAddresses.size} tokens from bsc.ts for BSC`);
    } catch (error) {
      console.error('[Token Analysis Service] Error importing BSCPriceFeeds:', error);
    }
  }

  const allTokens = await prisma.gameToken.findMany({
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
    take: 1000,
  });

  if (!allTokens || allTokens.length === 0) {
    console.warn(`[Token Analysis Service] No active tokens found in database for chainId: ${chainId}`);
    return { tokens: [], timePeriod: '24h' };
  }

  console.log(`[Token Analysis Service] Found ${allTokens.length} total active tokens for chainId: ${chainId}`);

  let filteredTokens = allTokens;
  if (allowedAddresses) {
    filteredTokens = allTokens.filter((token) => 
      allowedAddresses!.has(token.address.toLowerCase())
    );
    console.log(`[Token Analysis Service] Filtered from ${allTokens.length} to ${filteredTokens.length} tokens matching bsc.ts`);
  }

  if (filteredTokens.length === 0) {
    console.warn(`[Token Analysis Service] No tokens found after filtering for chainId: ${chainId}`);
    return { tokens: [], timePeriod: '24h' };
  }

  console.log(`[Token Analysis Service] Using ${filteredTokens.length} tokens for analysis (from bsc.ts)`);

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
- "Which tokens have the best performance in the last 24 hours?" -> timePeriod: "24h"
- "Show me coins with best performance in the last 20 minutes" -> timePeriod: "20m"
- "What tokens performed best this week?" -> timePeriod: "7d"
- "Which coins had the worst performance last month?" -> timePeriod: "30d"
- "best performant tokens the past four hours" -> timePeriod: "4h"
- "best performant tokens the past 24 hours" -> timePeriod: "24h"
- "best performant tokens the past month" -> timePeriod: "30d"

Examples of NON-analysis queries (these are about creating games):
- "Create a bull game"
- "Make a game for 10 players"
- "Bear game with 3 coins"

User query: "${text}"

Return a JSON object with:
{
  "timePeriod": "string describing the period. MUST be one of: "20m", "1h", "4h", "8h", "24h", "7d", "30d". Use exact format: "20m" for 20 minutes, "1h" for 1 hour, "4h" for 4 hours, "8h" for 8 hours, "24h" for 24 hours/1 day, "7d" for 7 days/week, "30d" for 30 days/month/year",
  "isAnalysisQuery": boolean (true if the query is asking for token/coin analysis/performance, false if it's about creating games)
}

CRITICAL RULES FOR timePeriod:
- "20 minutes", "20m", "past 20 minutes" -> "20m"
- "1 hour", "1h", "past hour", "last hour" -> "1h"
- "4 hours", "4h", "past four hours", "past 4 hours" -> "4h"
- "8 hours", "8h", "past 8 hours" -> "8h"
- "24 hours", "24h", "1 day", "past day", "last day", "past 24 hours" -> "24h"
- "7 days", "7d", "1 week", "1w", "past week", "last week" -> "7d"
- "30 days", "30d", "1 month", "1m", "past month", "last month", "year", "1y", "12m", "past year" -> "30d"

IMPORTANT: If the query mentions "create", "make", "game", "players", "bull", "bear" in the context of creating a game, set isAnalysisQuery to false.
If the query mentions "performance", "best", "worst", "top", "ranking", "performant", set isAnalysisQuery to true.

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

  let timePeriod = parsed.timePeriod || '24h';
  
  const textLower = text.toLowerCase();
  
  if (textLower.includes('twenty four hours') || textLower.includes('24 hours') || textLower.includes('past 24 hours') || 
      textLower.includes('past day') || textLower.includes('last day') || textLower.includes('one day')) {
    timePeriod = '24h';
  } else if (textLower.includes('past month') || textLower.includes('last month') || 
             (textLower.includes('month') && !textLower.includes('week') && !textLower.includes('four'))) {
    timePeriod = '30d';
  } else if (textLower.includes('past week') || textLower.includes('last week') || 
             (textLower.includes('week') && !textLower.includes('month') && !textLower.includes('four'))) {
    timePeriod = '7d';
  } else if ((textLower.includes('four hours') || textLower.includes('4 hours') || textLower.includes('past four hours') || 
              textLower.includes('past 4 hours')) && !textLower.includes('twenty four') && !textLower.includes('24')) {
    timePeriod = '4h';
  } else if (textLower.includes('8 hours') || textLower.includes('8h') || textLower === '8h' || textLower.includes('past 8 hours')) {
    timePeriod = '8h';
  } else if (textLower.includes('1 hour') || textLower.includes('past hour') || textLower.includes('last hour') || 
             textLower === '1h' || textLower.includes('one hour')) {
    timePeriod = '1h';
  } else if (textLower.includes('20 minutes') || textLower.includes('20m') || textLower === '20m' || textLower.includes('past 20 minutes')) {
    timePeriod = '20m';
  } else if (timePeriod && (timePeriod === '4h' || timePeriod === '24h' || timePeriod === '7d' || timePeriod === '30d' || 
             timePeriod === '1h' || timePeriod === '20m' || timePeriod === '8h')) {
  } else {
    timePeriod = '24h';
  }
  
  console.log(`[Token Analysis Service] Detected timePeriod: "${timePeriod}" from query: "${text}" (OpenAI returned: "${parsed.timePeriod}")`);

  const tokenPerformances: TokenPerformance[] = [];

  for (const token of filteredTokens) {
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
      const timePeriodLower = timePeriod.toLowerCase().trim();
      
      if (timePeriodLower === '20m' || timePeriodLower === '20 minutes' || timePeriodLower.includes('20 minutes') || timePeriodLower.includes('20m')) {
        historicalPriceStr = token.price20m;
      } else if (timePeriodLower === '1h' || timePeriodLower === '1 hour' || timePeriodLower.includes('past hour') || timePeriodLower.includes('last hour') || timePeriodLower.includes('1 hour')) {
        historicalPriceStr = token.price1h;
      } else if (timePeriodLower === '4h' || timePeriodLower === '4 hours' || timePeriodLower.includes('four hours') || timePeriodLower.includes('past four hours') || timePeriodLower.includes('past 4 hours') || timePeriodLower.includes('4 hours')) {
        historicalPriceStr = token.price4h;
      } else if (timePeriodLower === '8h' || timePeriodLower === '8 hours' || timePeriodLower.includes('past 8 hours') || timePeriodLower.includes('8 hours')) {
        historicalPriceStr = token.price8h;
      } else if (timePeriodLower === '24h' || timePeriodLower === '24 hours' || timePeriodLower === '1 day' || 
                 timePeriodLower.includes('past day') || timePeriodLower.includes('last day') || timePeriodLower.includes('past 24 hours') || 
                 timePeriodLower.includes('24 hours') || timePeriodLower.includes('1 day')) {
        historicalPriceStr = token.price24h;
      } else if (timePeriodLower === '7d' || timePeriodLower === '1w' || timePeriodLower === '7 days' || timePeriodLower === '1 week' ||
                 timePeriodLower.includes('past week') || timePeriodLower.includes('last week') || 
                 timePeriodLower.includes('7 days') || timePeriodLower.includes('week') || timePeriodLower.startsWith('1w')) {
        historicalPriceStr = token.price7d;
      } else if (timePeriodLower === '30d' || timePeriodLower === '1m' || timePeriodLower === '30 days' || timePeriodLower === '1 month' ||
                 timePeriodLower.includes('past month') || timePeriodLower.includes('last month') || 
                 timePeriodLower.includes('30 days') || timePeriodLower.includes('month') || timePeriodLower.includes('year') || 
                 timePeriodLower.includes('1y') || timePeriodLower.includes('12m') || timePeriodLower.includes('past year')) {
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

  const seenSymbols = new Map<string, TokenPerformance>();
  for (const token of tokenPerformances) {
    const symbolLower = token.symbol?.toLowerCase();
    if (!symbolLower) continue;
    
    const existing = seenSymbols.get(symbolLower);
    if (!existing) {
      seenSymbols.set(symbolLower, token);
    } else {
    }
  }
  
  const uniqueTokenPerformances = Array.from(seenSymbols.values());

  console.log(`[Token Analysis Service] Returning ${uniqueTokenPerformances.length} unique tokens (${tokenPerformances.length} total before deduplication) for timePeriod: ${timePeriod}`);

  if (uniqueTokenPerformances.length === 0) {
    console.warn('[Token Analysis Service] No token performances found. This might indicate an issue with the API calls or token data.');
  }

  return {
    tokens: uniqueTokenPerformances,
    timePeriod: timePeriod,
  };
}

