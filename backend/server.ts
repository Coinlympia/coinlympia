import cors from 'cors';
import express from 'express';
import { generateChatResponse } from './services/ai/chat-service';
import { parseGameRequest } from './services/ai/game-creation-service';
import { analyzeTokens } from './services/ai/token-analysis-service';
import { queryDatabase } from './services/database/query-service';
import type { ChatRequest, DatabaseQueryRequest, TokenAnalysisRequest } from './types';

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

app.listen(PORT, () => {
  logger.success(`Backend server running on http://localhost:${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Chat API: http://localhost:${PORT}/api/chat-response`);
  logger.info(`Game Parser API: http://localhost:${PORT}/api/parse-game-request`);
  logger.info(`Database Query API: http://localhost:${PORT}/api/query-database`);
  logger.info(`Token Analysis API: http://localhost:${PORT}/api/analyze-tokens`);
  logger.info(`Debug mode: ${process.env.DEBUG === 'true' ? 'ENABLED' : 'DISABLED'}`);
  logger.info(`CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
