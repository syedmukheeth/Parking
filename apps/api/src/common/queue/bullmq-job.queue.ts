import { type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import type { JobQueue } from './queue.interface';

const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

// Queue's NameType (and DataType) parameters default to a conditional type
// computed from DataTypeOrJob (`ExtractNameType<DataTypeOrJob, Default>`).
// Inside a generic class, `T` is an unresolved type parameter, so TypeScript
// can't evaluate that conditional and treats it as opaque - a plain `string`
// then fails to satisfy it even though every concrete instantiation resolves
// to `string`. Supplying all six type arguments explicitly bypasses the
// conditionals instead of relying on their defaults.
type JobQueueType<T> = Queue<T, void, string, T, void, string>;

export class BullMqJobQueue<T extends object> implements JobQueue<T>, OnModuleDestroy {
  private readonly connection: IORedis;
  private readonly queue: JobQueueType<T>;

  constructor(
    private readonly queueName: string,
    redisUrl: string,
  ) {
    // BullMQ requires this on the ioredis connection it's handed - without it,
    // blocking commands (used internally for job polling) fail under retry.
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue<T, void, string, T, void, string>(queueName, { connection: this.connection });
  }

  async enqueue(data: T): Promise<void> {
    await this.queue.add(this.queueName, data, DEFAULT_JOB_OPTIONS);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
