import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { TestingModule } from '@nestjs/testing';
import { DomainError } from '../../src/common/errors/domain-error';
import type { PrismaService } from '../../src/common/prisma/prisma.service';
import { BookingsService } from '../../src/features/bookings/bookings.service';
import { createFixtureSlotType, createFixtureUser } from './fixtures';
import { hasTestDatabase, truncateAll } from './setup';
import { buildTestingModule } from './test-module';

/**
 * Guards the strict-inequality rule directly: `<=` on the overlap bounds
 * would silently halve capacity at every hour boundary (docs/DATA-MODEL.md).
 */
describe.skipIf(!hasTestDatabase)('booking overlap boundary', () => {
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

  it('a booking ending at 14:00 does not conflict with one starting at 14:00', async () => {
    const { location, slotType } = await createFixtureSlotType(prisma, { capacity: 1 });
    const [userA, userB] = await Promise.all([createFixtureUser(prisma), createFixtureUser(prisma)]);

    await bookingsService.create(userA.id, {
      locationId: location.id,
      slotTypeId: slotType.id,
      startAt: new Date('2026-08-01T12:00:00.000Z'),
      endAt: new Date('2026-08-01T14:00:00.000Z'),
      vehicleNumber: 'AP39AB0001',
      vehicleType: 'CAR',
    });

    const adjacent = await bookingsService.create(userB.id, {
      locationId: location.id,
      slotTypeId: slotType.id,
      startAt: new Date('2026-08-01T14:00:00.000Z'),
      endAt: new Date('2026-08-01T16:00:00.000Z'),
      vehicleNumber: 'AP39AB0002',
      vehicleType: 'CAR',
    });

    expect(adjacent.booking.status).toBe('PENDING');
  });

  it('a booking overlapping by even one minute is rejected', async () => {
    const { location, slotType } = await createFixtureSlotType(prisma, { capacity: 1 });
    const [userA, userB] = await Promise.all([createFixtureUser(prisma), createFixtureUser(prisma)]);

    await bookingsService.create(userA.id, {
      locationId: location.id,
      slotTypeId: slotType.id,
      startAt: new Date('2026-08-01T12:00:00.000Z'),
      endAt: new Date('2026-08-01T14:00:00.000Z'),
      vehicleNumber: 'AP39AB0001',
      vehicleType: 'CAR',
    });

    await expect(
      bookingsService.create(userB.id, {
        locationId: location.id,
        slotTypeId: slotType.id,
        startAt: new Date('2026-08-01T13:59:00.000Z'),
        endAt: new Date('2026-08-01T15:00:00.000Z'),
        vehicleNumber: 'AP39AB0002',
        vehicleType: 'CAR',
      }),
    ).rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' } satisfies Partial<DomainError>);
  });
});
