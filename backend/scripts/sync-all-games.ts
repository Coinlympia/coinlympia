import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootEnvPath = resolve(__dirname, '..', '..', '.env');
const rootResult = config({ path: rootEnvPath });

const backendEnvPath = resolve(__dirname, '..', '.env');
const backendResult = config({ path: backendEnvPath });

const currentResult = config();

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set!');
  console.error('Please make sure you have a .env file in backend/.env with DATABASE_URL defined.');
  console.error(`Tried loading from:`);
  console.error(`  - ${rootEnvPath} (${rootResult.error ? 'NOT FOUND' : 'LOADED'})`);
  console.error(`  - ${backendEnvPath} (${backendResult.error ? 'NOT FOUND' : 'LOADED'})`);
  console.error(`  - Current directory (${currentResult.error ? 'NOT FOUND' : 'LOADED'})`);
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  const urlParts = dbUrl.split('@');
  if (urlParts.length > 1) {
    console.log(`DATABASE_URL format: ${dbUrl.substring(0, dbUrl.indexOf('@'))}@${urlParts[urlParts.length - 1].substring(0, 50)}...`);
  } else {
    console.log(`DATABASE_URL format: ${dbUrl.substring(0, 50)}...`);
  }
  
  if (dbUrl.startsWith('prisma+postgres://') || dbUrl.startsWith('prisma+postgresql://') || dbUrl.startsWith('prisma://')) {
    console.log('INFO: DATABASE_URL uses Prisma Accelerate format. This is correct for Prisma Accelerate.');
    console.log('The URL will be used as-is with Prisma Accelerate extension.');
  } else if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    console.error('ERROR: DATABASE_URL does not use a valid PostgreSQL connection string format!');
    console.error(`Current value starts with: ${dbUrl.substring(0, 20)}...`);
    console.error('');
    console.error('The DATABASE_URL should start with:');
    console.error('  - postgresql://');
    console.error('  - postgres://');
    console.error('  - prisma+postgres:// (for Prisma Accelerate, will be auto-converted)');
    console.error('');
    console.error('Please update your .env file to use the correct format.');
    process.exit(1);
  }
} else {
  console.error('ERROR: DATABASE_URL is not set after loading .env files!');
  process.exit(1);
}

import { syncAllGamesFromGraphQL } from '../services/database/graphql-sync-service';
import { ChainId } from '../../frontend/src/modules/common/constants/enums';

async function main() {
  const args = process.argv.slice(2);
  
  let chainId = ChainId.Polygon;
  if (args[0]) {
    const parsedChainId = parseInt(args[0], 10);
    if (!isNaN(parsedChainId)) {
      chainId = parsedChainId;
    } else {
      console.error(`Invalid chainId: ${args[0]}`);
      console.log('Valid chainIds: 137 (Polygon), 8453 (Base), 56 (BSC), 80001 (Mumbai)');
      process.exit(1);
    }
  }

  const status = args[1] || 'Waiting';
  
  console.log(`Starting sync for chainId ${chainId}, status: ${status}`);
  console.log('This will sync ALL games from GraphQL to the database...');
  console.log('');

  try {
    const result = await syncAllGamesFromGraphQL({
      chainId,
      status,
      limit: 100,
      skip: 0,
      syncAll: true,
      updateExisting: false,
    });

    console.log('');
    console.log('=== Sync Results ===');
    console.log(`Success: ${result.success}`);
    console.log(`Synced: ${result.synced} games`);
    console.log(`Updated: ${result.updated || 0} games`);
    console.log(`Skipped: ${result.skipped} games (already in database)`);
    console.log(`Errors: ${result.errors} games`);
    
    if (result.errorsDetails && result.errorsDetails.length > 0) {
      console.log('');
      console.log('=== Error Details ===');
      result.errorsDetails.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    if (result.error) {
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }

    console.log('');
    console.log('Sync completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during sync:', error);
    process.exit(1);
  }
}

main();

