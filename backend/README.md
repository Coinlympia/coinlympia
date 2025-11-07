# Coinlympia Backend Server

Independent backend server for Coinlympia's AI and database services, built with Vite.js and Express.

## Features

- ✅ **Vite.js** for bundling and hot reload
- ✅ **Real-time logging** with colors and timestamps
- ✅ **Hot reload** in development mode
- ✅ **CORS** configured for frontend
- ✅ **Complete error handling**
- ✅ **Detailed request/response logging**

## Installation

The backend uses dependencies from the main project (Yarn workspace). Make sure you have the dependencies installed:

```bash
# From the project root
yarn install
```

## Configuration

1. Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

2. Configure environment variables in `.env`:
- `OPENAI_API_KEY`: Your OpenAI API key
- `DATABASE_URL`: Database connection URL (if using Prisma directly)
- `BACKEND_PORT`: Backend server port (default: 5001)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:3000)
- `DEBUG`: Enable detailed logging (true/false, default: false)

## Execution

### Development mode (with hot reload)
```bash
# From the backend folder
cd backend
yarn dev

# Or from the project root
yarn dev:backend
```

The server will run on `http://localhost:5001` (or the port configured in `BACKEND_PORT`) with automatic hot reload using `tsx watch`.

### Production mode
```bash
yarn build
yarn start
```

## Logging

The server includes complete real-time logging with:
- ✅ **Timestamps** on every log
- ✅ **Colors** for different message types
- ✅ **Request/Response logging** with duration
- ✅ **Error logging** with stack traces
- ✅ **Debug mode** (enable with `DEBUG=true`)

### Log types:
- `ℹ` Info - General information
- `✓` Success - Successful operations
- `⚠` Warning - Warnings
- `✗` Error - Errors
- `🔍` Debug - Detailed information (only with `DEBUG=true`)

## Endpoints

- `GET /health` - Health check
- `POST /api/chat-response` - Generate chat response with AI
- `POST /api/parse-game-request` - Extract game parameters from text
- `POST /api/query-database` - Query database
- `POST /api/analyze-tokens` - Analyze tokens with CoinGecko

## Integration with Next.js

If you want to use this independent backend server with your Next.js application, update the URLs in the frontend components to point to `http://localhost:5001` instead of `/api/...`.

## Notes

- This server uses the same services as the Next.js API endpoints
- You can run both servers simultaneously if needed
- The independent backend server is useful for development, testing, or separate deployment
- Real-time logging allows you to monitor all server operations
