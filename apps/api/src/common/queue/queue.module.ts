import { Global, Module } from '@nestjs/common';
import { QUEUE_NAMES } from '@parkap/shared';
import { loadEnv } from '../../config/env';
import { BullMqJobQueue } from './bullmq-job.queue';
import { BOOKING_CONFIRMED_QUEUE } from './queue.interface';

@Global()
@Module({
  providers: [
    {
      provide: BOOKING_CONFIRMED_QUEUE,
      useFactory: () => new BullMqJobQueue(QUEUE_NAMES.bookingConfirmed, loadEnv().REDIS_URL),
    },
  ],
  exports: [BOOKING_CONFIRMED_QUEUE],
})
export class QueueModule {}
