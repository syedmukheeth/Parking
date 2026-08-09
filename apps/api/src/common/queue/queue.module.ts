import { Global, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { QUEUE_NAMES } from '@parkap/shared';
import { loadEnv } from '../../config/env';
import { BullMqJobQueue } from './bullmq-job.queue';
import { InlineBookingConfirmedQueue } from './inline-job.queue';
import { BOOKING_CONFIRMED_QUEUE } from './queue.interface';

@Global()
@Module({
  providers: [
    {
      provide: BOOKING_CONFIRMED_QUEUE,
      inject: [ModuleRef],
      // The seam the whole design rests on: producers depend on "a place to
      // put jobs", so swapping a real queue for in-process execution is this
      // factory and an env var, not a change to any service.
      useFactory: (moduleRef: ModuleRef) => {
        const env = loadEnv();
        return env.JOB_RUNNER === 'inline'
          ? new InlineBookingConfirmedQueue(moduleRef)
          : new BullMqJobQueue(QUEUE_NAMES.bookingConfirmed, env.REDIS_URL);
      },
    },
  ],
  exports: [BOOKING_CONFIRMED_QUEUE],
})
export class QueueModule {}
