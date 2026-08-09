import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES, type BookingConfirmedJobData } from '@parkap/shared';
import { loadEnv } from './config/env';
import { processBookingConfirmed } from './jobs/booking-confirmed.processor';
import { processHoldSweep } from './jobs/hold-sweep.processor';
import { initSentry } from './observability';
import { prisma } from './prisma';

const HOLD_SWEEP_INTERVAL_MS = 60_000;
const HOLD_SWEEP_REPEATABLE_JOB_ID = 'hold-sweep-repeatable';

async function main(): Promise<void> {
  const env = loadEnv();
  initSentry(env.SENTRY_DSN);
  console.warn(`[worker] starting (${env.NODE_ENV}), concurrency ${env.WORKER_CONCURRENCY}`);

  // BullMQ requires this on any connection it's handed - without it, the
  // blocking commands it uses internally fail under retry.
  const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

  const bookingConfirmedWorker = new Worker<BookingConfirmedJobData>(
    QUEUE_NAMES.bookingConfirmed,
    async (job: Job<BookingConfirmedJobData>) => {
      await processBookingConfirmed(job.data, env.TICKET_TOKEN_SECRET);
    },
    { connection, concurrency: env.WORKER_CONCURRENCY },
  );
  bookingConfirmedWorker.on('failed', (job, error) => {
    console.error(`[booking-confirmed] job ${job?.id} failed: ${error.message}`);
  });

  const holdSweepQueue = new Queue(QUEUE_NAMES.holdSweep, { connection });
  await holdSweepQueue.add(
    QUEUE_NAMES.holdSweep,
    {},
    { repeat: { every: HOLD_SWEEP_INTERVAL_MS }, jobId: HOLD_SWEEP_REPEATABLE_JOB_ID },
  );

  const holdSweepWorker = new Worker(
    QUEUE_NAMES.holdSweep,
    async () => {
      await processHoldSweep();
    },
    { connection, concurrency: 1 },
  );
  holdSweepWorker.on('failed', (job, error) => {
    console.error(`[hold-sweep] job ${job?.id} failed: ${error.message}`);
  });

  console.warn('[worker] ready - consuming booking-confirmed and hold-sweep queues');

  const shutdown = async (signal: string): Promise<void> => {
    console.warn(`[worker] ${signal} received, shutting down`);
    await Promise.all([
      bookingConfirmedWorker.close(),
      holdSweepWorker.close(),
      holdSweepQueue.close(),
      connection.quit(),
      prisma.$disconnect(),
    ]);
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void main();
