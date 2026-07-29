import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { CACHE_STORE } from '../../src/common/cache/cache-store.interface';
import { CacheModule } from '../../src/common/cache/cache.module';
import { RedisCacheStore } from '../../src/common/cache/redis-cache.store';
import { PrismaModule } from '../../src/common/prisma/prisma.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { BOOKING_CONFIRMED_QUEUE } from '../../src/common/queue/queue.interface';
import { QueueModule } from '../../src/common/queue/queue.module';
import { BookingsModule } from '../../src/features/bookings/bookings.module';
import { LocationsModule } from '../../src/features/locations/locations.module';
import { PaymentsModule } from '../../src/features/payments/payments.module';
import { RealtimeModule } from '../../src/features/realtime/realtime.module';
import { TicketsModule } from '../../src/features/tickets/tickets.module';
import { InMemoryCacheStore } from '../fakes/in-memory-cache.store';
import { createTestPrisma } from './setup';

/**
 * Wires the real feature modules through Nest's DI (so this exercises the
 * actual production wiring, not a hand-assembled stand-in), swapping only
 * the infra a test shouldn't depend on: a real Postgres test DB in place of
 * whatever DATABASE_URL points at, an in-memory CacheStore in place of Redis,
 * and a no-op queue so a job is never actually dispatched to a worker that
 * isn't running in this process.
 */
export async function buildTestingModule(options: {
  bookingConfirmedQueue?: { enqueue: (data: unknown) => Promise<void> };
} = {}): Promise<{ moduleRef: TestingModule; prisma: PrismaService }> {
  const prisma = createTestPrisma();

  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule, CacheModule, QueueModule, LocationsModule, PaymentsModule, RealtimeModule, BookingsModule, TicketsModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(RedisCacheStore)
    .useValue(new InMemoryCacheStore() as unknown as RedisCacheStore)
    .overrideProvider(CACHE_STORE)
    .useValue(new InMemoryCacheStore())
    .overrideProvider(BOOKING_CONFIRMED_QUEUE)
    .useValue(options.bookingConfirmedQueue ?? { enqueue: async () => Promise.resolve() })
    .compile();

  return { moduleRef, prisma };
}
