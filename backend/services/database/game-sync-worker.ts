import { syncAllGamesFromGraphQL } from './graphql-sync-service';

interface SyncWorkerConfig {
  chainId: number;
  pollInterval: number;
  enabled: boolean;
}

interface SyncWorkerState {
  isRunning: boolean;
  lastSyncTime: Date | null;
  lastError: string | null;
  gamesSynced: number;
  errors: number;
  startTime: Date | null;
}

class GameSyncWorker {
  private config: SyncWorkerConfig;
  private state: SyncWorkerState;
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;
  private logger: any;

  constructor(config: SyncWorkerConfig, logger: any) {
    this.config = config;
    this.logger = logger;
    this.state = {
      isRunning: false,
      lastSyncTime: null,
      lastError: null,
      gamesSynced: 0,
      errors: 0,
      startTime: null,
    };
  }

  start(): void {
    if (this.state.isRunning) {
      this.logger.warn(`Sync worker for chainId ${this.config.chainId} is already running`);
      return;
    }

    this.state.isRunning = true;
    this.state.startTime = new Date();
    this.logger.success(`Starting game sync worker for chainId ${this.config.chainId} (poll interval: ${this.config.pollInterval}ms)`);

    this.syncGames().catch((error) => {
      this.logger.error(`Error in initial sync for chainId ${this.config.chainId}:`, error);
    });

    this.intervalId = setInterval(() => {
      if (!this.isProcessing) {
        this.syncGames().catch((error) => {
          this.logger.error(`Error in periodic sync for chainId ${this.config.chainId}:`, error);
        });
      }
    }, this.config.pollInterval);
  }

  stop(): void {
    if (!this.state.isRunning) {
      this.logger.warn(`Sync worker for chainId ${this.config.chainId} is not running`);
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.state.isRunning = false;
    this.logger.success(`Stopped game sync worker for chainId ${this.config.chainId}`);
  }

  getState(): SyncWorkerState {
    return { ...this.state };
  }

  private async syncGames(): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug(`Sync already in progress for chainId ${this.config.chainId}, skipping...`);
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      this.logger.info(`Starting sync for chainId ${this.config.chainId}...`);

      const result = await syncAllGamesFromGraphQL({
        chainId: this.config.chainId,
        limit: 50,
        updateExisting: true,
        syncAll: false,
      });

      const duration = Date.now() - startTime;
      this.state.lastSyncTime = new Date();
      this.state.gamesSynced += result.synced + result.updated;
      this.state.errors += result.errors;
      this.state.lastError = result.error || null;

      if (result.success) {
        this.logger.info(`Sync completed for chainId ${this.config.chainId}: synced=${result.synced}, updated=${result.updated}, skipped=${result.skipped}, errors=${result.errors}, duration=${duration}ms`);
      } else {
        this.logger.warn(`Sync failed for chainId ${this.config.chainId}: ${result.error}`);
        if (result.errorsDetails && result.errorsDetails.length > 0) {
          this.logger.warn(`Error details for chainId ${this.config.chainId}:`, result.errorsDetails.slice(0, 3));
        }
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.state.lastError = error?.message || String(error);
      this.state.errors++;
      this.logger.error(`Error in sync for chainId ${this.config.chainId} after ${duration}ms:`, error);
      if (error?.stack) {
        this.logger.error(`Error stack for chainId ${this.config.chainId}:`, error.stack);
      }
    } finally {
      this.isProcessing = false;
    }
  }

}

export class GameSyncWorkerManager {
  private workers: Map<number, GameSyncWorker> = new Map();
  private logger: any;

  constructor(logger: any) {
    this.logger = logger;
  }

  startWorker(chainId: number, pollInterval: number = 120000): void {
    if (this.workers.has(chainId)) {
      this.logger.warn(`Worker for chainId ${chainId} already exists`);
      return;
    }

    const worker = new GameSyncWorker(
      {
        chainId,
        pollInterval,
        enabled: true,
      },
      this.logger
    );

    worker.start();
    this.workers.set(chainId, worker);
  }

  stopWorker(chainId: number): void {
    const worker = this.workers.get(chainId);
    if (worker) {
      worker.stop();
      this.workers.delete(chainId);
    }
  }

  getWorkerState(chainId: number): SyncWorkerState | null {
    const worker = this.workers.get(chainId);
    return worker ? worker.getState() : null;
  }

  getAllWorkersState(): { [chainId: number]: SyncWorkerState } {
    const states: { [chainId: number]: SyncWorkerState } = {};
    this.workers.forEach((worker, chainId) => {
      states[chainId] = worker.getState();
    });
    return states;
  }

  stopAll(): void {
    this.workers.forEach((worker, chainId) => {
      worker.stop();
    });
    this.workers.clear();
  }
}

