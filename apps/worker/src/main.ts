import { loadEnv } from './config/env';

/**
 * Worker entrypoint. Queue consumers (ticket issue, notification stub, invoice
 * stub, hold sweep, availability snapshots) are registered here in Phase 7,
 * once the payment pipeline exists to enqueue them.
 */
async function main(): Promise<void> {
  const env = loadEnv();

  if (!env.REDIS_URL) {
    console.warn('[worker] REDIS_URL is unset — no queues to consume, idling.');
  }

  console.warn(`[worker] started (${env.NODE_ENV}), concurrency ${env.WORKER_CONCURRENCY}`);

  const shutdown = (signal: string): void => {
    console.warn(`[worker] ${signal} received, shutting down`);
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

void main();
