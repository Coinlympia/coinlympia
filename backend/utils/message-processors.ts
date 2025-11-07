export interface GameParams {
  gameType?: 'bull' | 'bear';
  duration?: number;
  gameLevel?: number;
  maxCoins?: number;
  maxPlayers?: number;
  startDate?: number;
  selectedCoins?: string[];
}

export function parseGameCreationAction(responseText: string): {
  hasAction: boolean;
  gameParams?: GameParams;
  responseText?: string;
} {
  if (!responseText.includes('ACTION:CREATE_GAME')) {
    return { hasAction: false };
  }

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { hasAction: false };
    }

    let jsonString = jsonMatch[0];

    jsonString = jsonString.replace(/\/\/.*$/gm, '');

    const currentTime = Date.now();
    jsonString = jsonString.replace(/<current_time_in_milliseconds>/g, currentTime.toString());
    jsonString = jsonString.replace(/<current_time>/g, currentTime.toString());
    jsonString = jsonString.replace(/current_time_in_milliseconds/g, currentTime.toString());

    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

    const gameParams = JSON.parse(jsonString) as GameParams;

    if (!gameParams.startDate || isNaN(gameParams.startDate)) {
      gameParams.startDate = currentTime + 60000;
    } else {
      const minFutureTime = currentTime + 60000;
      if (gameParams.startDate < minFutureTime) {
        gameParams.startDate = minFutureTime;
      }
    }

    if (gameParams.gameType) {
      gameParams.gameType = gameParams.gameType.toLowerCase();
      if (gameParams.gameType !== 'bull' && gameParams.gameType !== 'bear') {
        gameParams.gameType = 'bull';
      }
    }

    const cleanedResponse = responseText.replace(/ACTION:CREATE_GAME[\s\S]*/, '').trim() || 'Perfect! Creating the game now...';

    return {
      hasAction: true,
      gameParams,
      responseText: cleanedResponse,
    };
  } catch (error) {
    console.error('Error parsing game creation action:', error);
    return { hasAction: false };
  }
}

export function validateGameParams(gameParams: GameParams): {
  isValid: boolean;
  missingParams: string[];
} {
  const requiredParams = ['gameType', 'duration', 'gameLevel', 'maxCoins', 'maxPlayers', 'startDate'];
  const missingParams = requiredParams.filter(param => {
    if (param === 'gameLevel') {
      return !gameParams[param] || gameParams[param] < 1 || gameParams[param] > 6;
    }
    return !gameParams[param] && gameParams[param] !== 0;
  });

  if (!gameParams.selectedCoins || gameParams.selectedCoins.length === 0) {
    missingParams.push('selectedCoins');
  }

  return {
    isValid: missingParams.length === 0,
    missingParams,
  };
}

export function mapCoinSymbolsToAddresses(
  selectedCoins: string[],
  databaseTokens?: any[]
): string[] {
  if (!databaseTokens || databaseTokens.length === 0) {
    return selectedCoins;
  }

  return selectedCoins.map((coin: string) => {
    if (coin.startsWith('0x')) {
      return coin;
    }

    const token = databaseTokens.find((t: any) =>
      t.symbol.toLowerCase() === coin.toLowerCase() ||
      t.name.toLowerCase() === coin.toLowerCase()
    );

    if (token) {
      return token.address;
    }

    return coin;
  });
}

export function isAskingForCoinsInResponse(
  responseText: string,
  hasSelectedCoins: boolean
): boolean {
  if (hasSelectedCoins) {
    return false;
  }

  const responseLower = responseText.toLowerCase();
  return (
    responseLower.includes('select') || responseLower.includes('elegir') ||
    responseLower.includes('seleccionar') || responseLower.includes('choose') ||
    (responseLower.includes('moneda') && (responseLower.includes('seleccion') || responseLower.includes('elegir'))) ||
    (responseLower.includes('coin') && (responseLower.includes('select') || responseLower.includes('choose'))) ||
    (responseLower.includes('token') && (responseLower.includes('select') || responseLower.includes('choose'))) ||
    responseLower.includes('qué monedas') || responseLower.includes('which coins') ||
    responseLower.includes('qué tokens') || responseLower.includes('which tokens') ||
    responseLower.includes('selecciona') || responseLower.includes('elige') ||
    responseLower.includes('por favor, elige') || responseLower.includes('please select')
  );
}

