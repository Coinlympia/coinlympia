# Coinlympia

Monorepo for Coinlympia platform with separated frontend and backend.

## Structure

```
coinlympia/
├── frontend/     # Next.js frontend application
├── backend/      # Express backend server with AI services
├── node_modules/ # Shared dependencies (managed by Yarn workspaces)
├── package.json  # Root workspace configuration
└── yarn.lock     # Dependency lockfile
```

## Prerequisites

- Node.js 22.x
- Yarn 1.22.18 (or compatible version)

## Installation

### 1. Install all dependencies

From the root directory, run:

```bash
yarn install --ignore-scripts
```

**Important**: Use `--ignore-scripts` to avoid `patch-package` errors with `rollup`. This will:
- Install all dependencies for the root workspace
- Install dependencies for `frontend/` workspace
- Install dependencies for `backend/` workspace
- Install dependencies for all packages in `frontend/packages/*`
- Skip problematic postinstall scripts

After installation, manually build the required packages:

```bash
yarn build:packages
```

### 2. Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=your_database_url_here

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Backend Server
BACKEND_PORT=5001
FRONTEND_URL=http://localhost:3000
DEBUG=false

# Frontend (if needed)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Database Setup

Generate Prisma client and run migrations:

```bash
# Generate Prisma client
yarn db:generate

# Push database schema (development)
yarn db:push

# Or run migrations (production)
yarn db:migrate
```

## Development

### Run Frontend Only

```bash
yarn dev
# or
cd frontend && yarn dev
```

Frontend will run on `http://localhost:3000`

### Run Backend Only

```bash
yarn dev:backend
# or
cd backend && yarn dev
```

Backend will run on `http://localhost:5001`

### Run Both (Frontend + Backend)

```bash
yarn dev:all
```

This will start both frontend and backend concurrently.

## Production Build

### Build Frontend

```bash
yarn build
# or
cd frontend && yarn build
```

### Build Backend

```bash
cd backend && yarn build
```

### Start Production Servers

```bash
# Frontend
cd frontend && yarn start

# Backend
cd backend && yarn start
```

## Workspace Commands

Since this is a Yarn workspace, you can run commands in specific workspaces:

```bash
# Run command in frontend
yarn workspace coinlympia-frontend <command>

# Run command in backend
yarn workspace coinlympia-backend <command>
```

## Database Commands

All database commands are run from the root:

```bash
yarn db:generate    # Generate Prisma client
yarn db:push        # Push schema to database (dev)
yarn db:migrate     # Run migrations (prod)
yarn db:studio      # Open Prisma Studio
yarn db:seed        # Seed database
```

## Troubleshooting

### If dependencies are not installing correctly:

1. Delete all `node_modules` folders:
   ```bash
   # Windows PowerShell
   Get-ChildItem -Path . -Recurse -Directory -Filter "node_modules" | Remove-Item -Recurse -Force
   ```

2. Delete `yarn.lock` (optional, only if you want a fresh lockfile):
   ```bash
   rm yarn.lock
   ```

3. Clear Yarn cache:
   ```bash
   yarn cache clean
   ```

4. Reinstall:
   ```bash
   yarn install --ignore-scripts
   yarn build:packages
   ```

### If workspace commands don't work:

Make sure you're in the root directory and that `package.json` has the correct workspace configuration.

## Notes

- All dependencies are managed at the root level via Yarn workspaces
- Each workspace (`frontend/`, `backend/`) can have its own `package.json` with specific dependencies
- Shared dependencies are hoisted to the root `node_modules/`
- The `packages/` folder is inside `frontend/` and contains shared frontend packages
