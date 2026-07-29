import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { TestingModule } from '@nestjs/testing';
import { DomainError } from '../../src/common/errors/domain-error';
import type { PrismaService } from '../../src/common/prisma/prisma.service';
import { BookingsService } from '../../src/features/bookings/bookings.service';
import { createFixtureSlotType, createFixtureUser } from './fixtures';
import { truncateAll } from './setup';
import { buildTestingModule } from './test-module';

/**
 * The single most important test in the repo (parkap-testing skill): N
 * concurrent attempts to reserve the last slot must produce exactly one
 * success, the rest SLOT_UNAVAILABLE. This exercises the Serializable
 * transaction in BookingRepository.countOverlapping directly — no mock
 * would prove anything here, hence a real Postgres.
 */
describe('booking capacity race', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let bookingsService: BookingsService;

  beforeEach(async () => {
    ({ moduleRef, prisma } = await buildTestingModule());
    await truncateAll(prisma);
    bookingsService = moduleRef.get(BookingsService);
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  it('confirms exactly one of N concurrent reservations for the last slot', async () => {
    const CONCURRENCY = 8;
    const { location, slotType } = await createFixtureSlotType(prisma, { capacity: 1 });
    const users = await Promise.all(
      Array.from({ length: CONCURRENCY }, () => createFixtureUser(prisma)),
    );

    const startAt = new Date('2026-08-01T09:00:00.000Z');
    const endAt = new Date('2026-08-01T10:00:00.000Z');

    const results = await Promise.allSettled(
      users.map((user) =>
        bookingsService.create(user.id, {
          locationId: location.id,
          slotTypeId: slotType.id,
          startAt,
          endAt,
          vehicleNumber: 'AP39AB1234',
          vehicleType: 'CAR',
        }),
      ),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(CONCURRENCY - 1);
    for (const failure of failed) {
      expect(failure.reason).toBeInstanceOf(DomainError);
      expect((failure.reason as DomainError).code).toBe('SLOT_UNAVAILABLE');
    }

    const bookingCount = await prisma.booking.count({ where: { slotTypeId: slotType.id } });
    expect(bookingCount).toBe(1);
  });

  it('allows a second booking once capacity frees up (non-overlapping window)', async () => {
    const { location, slotType } = await createFixtureSlotType(prisma, { capacity: 1 });
    const [userA, userB] = await Promise.all([createFixtureUser(prisma), createFixtureUser(prisma)]);

    await bookingsService.create(userA.id, {
      locationId: location.id,
      slotTypeId: slotType.id,
      startAt: new Date('2026-08-01T09:00:00.000Z'),
      endAt: new Date('2026-08-01T10:00:00.000Z'),
      vehicleNumber: 'AP39AB0001',
      vehicleType: 'CAR',
    });

    // Starts exactly when the first one ends — must succeed (strict inequality).
    const second = await bookingsService.create(userB.id, {
      locationId: location.id,
      slotTypeId: slotType.id,
      startAt: new Date('2026-08-01T10:00:00.000Z'),
      endAt: new Date('2026-08-01T11:00:00.000Z'),
      vehicleNumber: 'AP39AB0002',
      vehicleType: 'CAR',
    });

    expect(second.booking.status).toBe('PENDING');
  });
});
