import { config } from 'dotenv';
import cors from 'cors';
import express from 'express';
import { generateChatResponse } from './services/ai/chat-service';
import { parseGameRequest } from './services/ai/game-creation-service';
import { prepareJoinGame } from './services/ai/join-game-service';
import { analyzeTokens } from './services/ai/token-analysis-service';
import { queryDatabase } from './services/database/query-service';
import { GameSyncWorkerManager } from './services/database/game-sync-worker';
import type { ChatRequest, DatabaseQueryRequest, FindGamesRequest, JoinGameRequest, TokenAnalysisRequest } from './types';
import { ChainId } from '../frontend/src/modules/common/constants/enums';

config();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const logger = {
  info: (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${colors.green}ℹ${colors.reset} ${message}`, ...args);
  },
  success: (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${colors.green}✓${colors.reset} ${colors.green}${message}${colors.reset}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${colors.yellow}⚠${colors.reset} ${colors.yellow}${message}${colors.reset}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    console.error(`${colors.cyan}[${timestamp}]${colors.reset} ${colors.red}✗${colors.reset} ${colors.red}${message}${colors.reset}`, ...args);
  },
  request: (method: string, path: string, status: number, duration?: number) => {
    const timestamp = new Date().toISOString();
    const statusColor = status >= 500 ? colors.red : status >= 400 ? colors.yellow : colors.green;
    const durationStr = duration ? ` ${colors.dim}(${duration}ms)${colors.reset}` : '';
    console.log(
      `${colors.cyan}[${timestamp}]${colors.reset} ${colors.blue}${method}${colors.reset} ${path} ${statusColor}${status}${colors.reset}${durationStr}`
    );
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.DEBUG === 'true') {
      const timestamp = new Date().toISOString();
      console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${colors.dim}🔍${colors.reset} ${colors.dim}${message}${colors.reset}`, ...args);
    }
  },
};

const app = express();
const PORT = process.env.BACKEND_PORT || 5001;
const STATUS_PORT = process.env.STATUS_PORT || 8080;

app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function (body) {
    const duration = Date.now() - start;
    logger.request(req.method, req.path, res.statusCode, duration);
    if (process.env.DEBUG === 'true') {
      logger.debug('Request body:', req.body);
      logger.debug('Response body:', body);
    }
    return originalSend.call(this, body);
  };

  next();
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

app.get('/health', (req, res) => {
  logger.info('Health check requested');
  res.json({
    status: 'ok',
    message: 'Backend server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});


app.post('/api/chat-response', async (req, res) => {
  const startTime = Date.now();
  logger.info('Chat response request received');
  logger.debug('Chat request:', JSON.stringify(req.body, null, 2));

  try {
    const request: ChatRequest = req.body;

    if (!request.message) {
      logger.warn('Chat response request missing message');
      return res.status(400).json({ error: 'Message is required' });
    }

    logger.info(`Processing chat message: "${request.message.substring(0, 50)}..."`);
    const result = await generateChatResponse(request);
    const duration = Date.now() - startTime;
    logger.success(`Chat response generated in ${duration}ms`);
    logger.debug('Chat response:', JSON.stringify(result, null, 2));

    res.status(200).json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Error generating chat response after ${duration}ms:`, error);
    if (error instanceof Error) {
      logger.error('Error stack:', error.stack);
    }
    res.status(500).json({ error: 'Failed to generate chat response' });
  }
});

app.post('/api/parse-game-request', async (req, res) => {
  const startTime = Date.now();
  logger.info('Parse game request received');
  logger.debug('Parse request:', JSON.stringify(req.body, null, 2));

  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      logger.warn('Parse game request missing text');
      return res.status(400).json({ error: 'Text is required' });
    }

    logger.info(`Parsing game request: "${text.substring(0, 50)}..."`);
    const result = await parseGameRequest(text);
    const duration = Date.now() - startTime;
    logger.success(`Game request parsed in ${duration}ms`);
    logger.debug('Parsed result:', JSON.stringify(result, null, 2));

    res.status(200).json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Error parsing game request after ${duration}ms:`, error);
    if (error instanceof Error) {
      logger.error('Error stack:', error.stack);
    }
    res.status(500).json({ error: 'Failed to parse game request' });
  }
});

app.post('/api/query-database', async (req, res) => {
  const startTime = Date.now();
  logger.info('Database query request received');
  logger.debug('Query request:', JSON.stringify(req.body, null, 2));

  try {
    const request: DatabaseQueryRequest = req.body;

    if (!request.query || typeof request.query !== 'string') {
      logger.warn('Database query request missing query');
      return res.status(400).json({ error: 'Query is required', success: false });
    }

    logger.info(`Executing database query: "${request.query.substring(0, 50)}..."`);
    const result = await queryDatabase(request);
    const duration = Date.now() - startTime;

    if (!result.success) {
      logger.warn(`Database query failed after ${duration}ms:`, result.error);
      return res.status(500).json(result);
    }

    logger.success(`Database query completed in ${duration}ms`);
    logger.debug('Query result:', JSON.stringify(result, null, 2));

    res.status(200).json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Error querying database after ${duration}ms:`, error);
    if (error instanceof Error) {
      logger.error('Error stack:', error.stack);
    }
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to query database',
    });
  }
});

app.post('/api/analyze-tokens', async (req, res) => {
  const startTime = Date.now();
  logger.info('Token analysis request received');
  logger.debug('Analysis request:', JSON.stringify(req.body, null, 2));

  try {
    const request: TokenAnalysisRequest = req.body;

    if (!request.text || typeof request.text !== 'string') {
      logger.warn('Token analysis request missing text');
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!request.chainId) {
      logger.warn('Token analysis request missing chainId');
      return res.status(400).json({ error: 'ChainId is required' });
    }

    logger.info(`Analyzing tokens for chain ${request.chainId}: "${request.text.substring(0, 50)}..."`);
    const result = await analyzeTokens(request);
    const duration = Date.now() - startTime;
    logger.success(`Token analysis completed in ${duration}ms - Found ${result.tokens.length} tokens`);
    logger.debug('Analysis result:', JSON.stringify(result, null, 2));

    res.status(200).json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Error analyzing tokens after ${duration}ms:`, error);
    if (error instanceof Error) {
      logger.error('Error stack:', error.stack);
    }
    res.status(500).json({ error: 'Failed to analyze tokens' });
  }
});

app.post('/api/join-game', async (req, res) => {
  const startTime = Date.now();
  logger.info('Join game request received');
  logger.debug('Join game request:', JSON.stringify(req.body, null, 2));

  try {
    const request: JoinGameRequest = req.body;

    if (!request.gameId) {
      logger.warn('Join game request missing gameId');
      return res.status(400).json({ error: 'Game ID is required' });
    }

    if (!request.selectedCoins || request.selectedCoins.length === 0) {
      logger.warn('Join game request missing selectedCoins');
      return res.status(400).json({ error: 'Selected coins are required' });
    }

    if (!request.chainId) {
      logger.warn('Join game request missing chainId');
      return res.status(400).json({ error: 'Chain ID is required' });
    }

    if (!request.maxCoins || request.maxCoins < 2) {
      logger.warn('Join game request missing or invalid maxCoins');
      return res.status(400).json({ error: 'Max coins must be at least 2' });
    }

    const result = await prepareJoinGame(request);
    const duration = Date.now() - startTime;
    logger.success(`Join game prepared successfully in ${duration}ms`);
    logger.debug('Join game response:', JSON.stringify(result, null, 2));
    return res.status(200).json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Error preparing join game after ${duration}ms:`, error);
    if (error instanceof Error) {
      logger.error('Error stack:', error.stack);
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to prepare join game';
    return res.status(500).json({ error: errorMessage });
  }
});

app.post('/api/register-participant', async (req, res) => {
  const startTime = Date.now();
  logger.info('Register participant request received');
  logger.debug('Register participant request:', JSON.stringify(req.body, null, 2));

  try {
    const { registerGameParticipant } = await import('./services/database/participant-service');
    const result = await registerGameParticipant(req.body);
    const duration = Date.now() - startTime;
    
    if (result.success) {
      logger.success(`Participant registered successfully in ${duration}ms`);
      logger.debug('Register participant response:', JSON.stringify(result, null, 2));
      return res.status(200).json(result);
    } else {
      logger.warn(`Failed to register participant after ${duration}ms: ${result.error}`);
      return res.status(400).json(result);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Error registering participant after ${duration}ms:`, error);
    if (error instanceof Error) {
      logger.error('Error stack:', error.stack);
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to register participant';
    return res.status(500).json({ success: false, error: errorMessage });
  }
});

app.post('/api/sync-games', async (req, res) => {
  const startTime = Date.now();
  logger.info('Sync games request received');
  logger.debug('Sync games request:', JSON.stringify(req.body, null, 2));

  try {
    const { syncAllGamesFromGraphQL } = await import('./services/database/graphql-sync-service');
    const result = await syncAllGamesFromGraphQL({
      ...req.body,
      updateExisting: req.body.updateExisting || false,
    });
    const duration = Date.now() - startTime;
    
    if (result.success) {
      logger.success(`Synced ${result.synced} games, updated ${result.updated || 0}, skipped ${result.skipped}, errors ${result.errors} in ${duration}ms`);
      logger.debug('Sync games response:', JSON.stringify(result, null, 2));
      return res.status(200).json(result);
    } else {
      logger.warn(`Failed to sync games after ${duration}ms: ${result.error}`);
      return res.status(400).json(result);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Error syncing games after ${duration}ms:`, error);
    if (error instanceof Error) {
      logger.error('Error stack:', error.stack);
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to sync games';
    return res.status(500).json({ success: false, error: errorMessage, synced: 0, updated: 0, skipped: 0, errors: 0 });
  }
});

app.post('/api/sync/graphql', async (req, res) => {
  const startTime = Date.now();
  logger.info('GraphQL sync request received');
  logger.debug('GraphQL sync request:', JSON.stringify(req.body, null, 2));

  try {
    const { syncAllGamesFromGraphQL } = await import('./services/database/graphql-sync-service');
    const result = await syncAllGamesFromGraphQL(req.body);
    const duration = Date.now() - startTime;

    if (result.success) {
      logger.success(`GraphQL sync completed: synced=${result.synced}, updated=${result.updated}, skipped=${result.skipped}, errors=${result.errors} in ${duration}ms`);
      logger.debug('GraphQL sync response:', JSON.stringify(result, null, 2));
      return res.status(200).json(result);
    } else {
      logger.warn(`GraphQL sync failed after ${duration}ms: ${result.error}`);
      return res.status(400).json(result);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Error in GraphQL sync after ${duration}ms:`, error);
    if (error instanceof Error) {
      logger.error('Error stack:', error.stack);
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to sync from GraphQL';
    return res.status(500).json({ 
      success: false, 
      error: errorMessage, 
      synced: 0, 
      updated: 0,
      skipped: 0, 
      errors: 0 
    });
  }
});

app.post('/api/find-games', async (req, res) => {
  const startTime = Date.now();
  logger.info('Find games request received');
  logger.debug('Find games request:', JSON.stringify(req.body, null, 2));

  try {
    const { findAvailableGames } = await import('./services/ai/find-games-service');
    const request: FindGamesRequest = req.body;

    const result = await findAvailableGames(request);
    const duration = Date.now() - startTime;
    logger.success(`Found ${result.count} games in ${duration}ms`);
    logger.debug('Find games response:', JSON.stringify(result, null, 2));
    return res.status(200).json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Error finding games after ${duration}ms:`, error);
    if (error instanceof Error) {
      logger.error('Error stack:', error.stack);
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to find games';
    return res.status(500).json({ error: errorMessage });
  }
});

const syncWorkerManager = new GameSyncWorkerManager(logger);

const SYNC_ENABLED = process.env.GAME_SYNC_ENABLED !== 'false';
const SYNC_POLL_INTERVAL = parseInt(process.env.GAME_SYNC_POLL_INTERVAL || '120000', 10);

if (SYNC_ENABLED) {
  logger.info('Game sync workers enabled');
  logger.info(`Poll interval: ${SYNC_POLL_INTERVAL}ms`);
  
  const enabledChainsEnv = process.env.GAME_SYNC_CHAINS;
  let supportedChains: number[];
  
  if (enabledChainsEnv) {
    supportedChains = enabledChainsEnv
      .split(',')
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id) && id > 0);
    logger.info(`Using custom chain list from GAME_SYNC_CHAINS: ${supportedChains.join(', ')}`);
  } else {
    supportedChains = [ChainId.Polygon];
    logger.info(`Using default chain list: ${supportedChains.join(', ')}`);
  }
  
  supportedChains.forEach(chainId => {
    try {
      syncWorkerManager.startWorker(chainId, SYNC_POLL_INTERVAL);
      logger.success(`Started sync worker for chainId ${chainId}`);
    } catch (error) {
      logger.error(`Failed to start sync worker for chainId ${chainId}:`, error);
    }
  });
} else {
  logger.info('Game sync workers disabled (set GAME_SYNC_ENABLED=true to enable)');
}

app.get('/api/sync/status', (req, res) => {
  try {
    const states = syncWorkerManager.getAllWorkersState();
    res.json({
      success: true,
      enabled: SYNC_ENABLED,
      pollInterval: SYNC_POLL_INTERVAL,
      workers: states,
    });
  } catch (error: any) {
    logger.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Unknown error',
    });
  }
});

app.post('/api/sync/start', (req, res) => {
  try {
    const { chainId, pollInterval } = req.body;
    
    if (!chainId) {
      return res.status(400).json({
        success: false,
        error: 'chainId is required',
      });
    }

    const interval = pollInterval || SYNC_POLL_INTERVAL;
    syncWorkerManager.startWorker(chainId, interval);
    
    logger.info(`Started sync worker for chainId ${chainId} via API`);
    res.json({
      success: true,
      message: `Sync worker started for chainId ${chainId}`,
    });
  } catch (error: any) {
    logger.error('Error starting sync worker:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Unknown error',
    });
  }
});

app.post('/api/sync/stop', (req, res) => {
  try {
    const { chainId } = req.body;
    
    if (!chainId) {
      return res.status(400).json({
        success: false,
        error: 'chainId is required',
      });
    }

    syncWorkerManager.stopWorker(chainId);
    
    logger.info(`Stopped sync worker for chainId ${chainId} via API`);
    res.json({
      success: true,
      message: `Sync worker stopped for chainId ${chainId}`,
    });
  } catch (error: any) {
    logger.error('Error stopping sync worker:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Unknown error',
    });
  }
});

app.get('/api/sync/worker/:chainId', (req, res) => {
  try {
    const chainId = parseInt(req.params.chainId, 10);
    
    if (isNaN(chainId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chainId',
      });
    }

    const state = syncWorkerManager.getWorkerState(chainId);
    
    if (!state) {
      return res.status(404).json({
        success: false,
        error: `No worker found for chainId ${chainId}`,
      });
    }

    res.json({
      success: true,
      chainId,
      state,
    });
  } catch (error: any) {
    logger.error('Error getting worker state:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Unknown error',
    });
  }
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  if (err.stack) {
    logger.error('Error stack:', err.stack);
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

const statusApp = express();
statusApp.use(express.static('public'));

statusApp.get('/', async (req, res) => {
  try {
    const states = syncWorkerManager.getAllWorkersState();
    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);
    const uptimeSeconds = Math.floor(uptime % 60);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coinlympia Backend Status</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: #333;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 900px;
            width: 100%;
            padding: 40px;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .logo {
            max-width: 200px;
            height: auto;
            margin-bottom: 20px;
        }
        h1 {
            color: #667eea;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 1.1em;
        }
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .status-card {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            border-radius: 15px;
            padding: 25px;
            text-align: center;
            transition: transform 0.3s ease;
        }
        .status-card:hover {
            transform: translateY(-5px);
        }
        .status-card h3 {
            color: #667eea;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        .status-card .value {
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9em;
            margin-top: 10px;
        }
        .status-badge.online {
            background: #10b981;
            color: white;
        }
        .status-badge.offline {
            background: #ef4444;
            color: white;
        }
        .workers-section {
            margin-top: 30px;
        }
        .workers-section h2 {
            color: #667eea;
            margin-bottom: 20px;
            font-size: 1.8em;
        }
        .worker-card {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 4px solid #667eea;
        }
        .worker-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .worker-header h3 {
            color: #333;
            font-size: 1.2em;
        }
        .worker-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .worker-stat {
            background: white;
            padding: 12px;
            border-radius: 8px;
        }
        .worker-stat-label {
            font-size: 0.85em;
            color: #666;
            margin-bottom: 5px;
        }
        .worker-stat-value {
            font-size: 1.3em;
            font-weight: bold;
            color: #333;
        }
        .no-workers {
            text-align: center;
            color: #666;
            padding: 40px;
            font-size: 1.1em;
        }
        .timestamp {
            text-align: center;
            color: #999;
            font-size: 0.9em;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="/coinlympia-logo.png" alt="Coinlympia Logo" class="logo" />
            <h1>Coinlympia Backend</h1>
            <p class="subtitle">Server Status Dashboard</p>
        </div>
        
        <div class="status-grid">
            <div class="status-card">
                <h3>Server Status</h3>
                <div class="value">Online</div>
                <span class="status-badge online">Running</span>
            </div>
            <div class="status-card">
                <h3>Uptime</h3>
                <div class="value">${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s</div>
            </div>
            <div class="status-card">
                <h3>Sync Workers</h3>
                <div class="value">${Object.keys(states).length}</div>
                <span class="status-badge ${SYNC_ENABLED ? 'online' : 'offline'}">${SYNC_ENABLED ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div class="status-card">
                <h3>Poll Interval</h3>
                <div class="value">${Math.floor(SYNC_POLL_INTERVAL / 1000)}s</div>
            </div>
        </div>
        
        <div class="workers-section">
            <h2>Sync Workers Status</h2>
            ${Object.keys(states).length === 0 ? 
                '<div class="no-workers">No sync workers are currently running.</div>' :
                Object.entries(states).map(([chainId, state]: [string, any]) => {
                    const chainNames: { [key: number]: string } = {
                        137: 'Polygon',
                        8453: 'Base',
                        56: 'BSC',
                        80001: 'Mumbai'
                    };
                    const chainName = chainNames[parseInt(chainId)] || 'Chain ' + chainId;
                    const lastSync = state.lastSyncTime ? new Date(state.lastSyncTime).toLocaleString() : 'Never';
                    const runningTime = state.startTime ? Math.floor((Date.now() - new Date(state.startTime).getTime()) / 1000) : 0;
                    const runningHours = Math.floor(runningTime / 3600);
                    const runningMinutes = Math.floor((runningTime % 3600) / 60);
                    const errorHtml = state.lastError ? 
                        '<div style="margin-top: 15px; padding: 10px; background: #fee; border-radius: 6px; color: #c33; font-size: 0.9em;"><strong>Last Error:</strong> ' + state.lastError + '</div>' : '';
                    
                    return '<div class="worker-card">' +
                        '<div class="worker-header">' +
                        '<h3>' + chainName + ' (Chain ID: ' + chainId + ')</h3>' +
                        '<span class="status-badge ' + (state.isRunning ? 'online' : 'offline') + '">' +
                        (state.isRunning ? 'Running' : 'Stopped') +
                        '</span>' +
                        '</div>' +
                        '<div class="worker-stats">' +
                        '<div class="worker-stat">' +
                        '<div class="worker-stat-label">Games Synced</div>' +
                        '<div class="worker-stat-value">' + (state.gamesSynced || 0) + '</div>' +
                        '</div>' +
                        '<div class="worker-stat">' +
                        '<div class="worker-stat-label">Errors</div>' +
                        '<div class="worker-stat-value">' + (state.errors || 0) + '</div>' +
                        '</div>' +
                        '<div class="worker-stat">' +
                        '<div class="worker-stat-label">Last Sync</div>' +
                        '<div class="worker-stat-value" style="font-size: 0.9em;">' + lastSync + '</div>' +
                        '</div>' +
                        '<div class="worker-stat">' +
                        '<div class="worker-stat-label">Running Time</div>' +
                        '<div class="worker-stat-value" style="font-size: 0.9em;">' + runningHours + 'h ' + runningMinutes + 'm</div>' +
                        '</div>' +
                        '</div>' +
                        errorHtml +
                        '</div>';
                }).join('')
            }
        </div>
        
        <div class="timestamp">
            Last updated: ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    logger.error('Error generating status page:', error);
    res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1 style="color: #ef4444;">Error</h1>
          <p>Failed to generate status page: ${error?.message || 'Unknown error'}</p>
        </body>
      </html>
    `);
  }
});

app.listen(PORT, () => {
  logger.success(`Backend server running on http://localhost:${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`Chat API: http://localhost:${PORT}/api/chat-response`);
    logger.info(`Game Parser API: http://localhost:${PORT}/api/parse-game-request`);
    logger.info(`Database Query API: http://localhost:${PORT}/api/query-database`);
    logger.info(`Token Analysis API: http://localhost:${PORT}/api/analyze-tokens`);
    logger.info(`Join Game API: http://localhost:${PORT}/api/join-game`);
    logger.info(`Sync Status API: http://localhost:${PORT}/api/sync/status`);
  logger.info(`Debug mode: ${process.env.DEBUG === 'true' ? 'ENABLED' : 'DISABLED'}`);
  logger.info(`CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

statusApp.listen(STATUS_PORT, () => {
  logger.success(`Status page server running on http://localhost:${STATUS_PORT}`);
  logger.info(`Status page: http://localhost:${STATUS_PORT}/`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  syncWorkerManager.stopAll();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  syncWorkerManager.stopAll();
  process.exit(0);
});
