import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { TestingModule } from '@nestjs/testing';
import { DomainError } from '../../src/common/errors/domain-error';
import type { PrismaService } from '../../src/common/prisma/prisma.service';
import { TicketsService } from '../../src/features/tickets/tickets.service';
import { createFixtureSlotType, createFixtureUser } from './fixtures';
import { hasTestDatabase, truncateAll } from './setup';
import { buildTestingModule } from './test-module';

const STAFF_USER_ID = 'staff_fixture_user';

describe.skipIf(!hasTestDatabase)('ticket QR verify/exit', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let ticketsService: TicketsService;

  beforeEach(async () => {
    ({ moduleRef, prisma } = await buildTestingModule());
    await truncateAll(prisma);
    ticketsService = moduleRef.get(TicketsService);
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  async function createConfirmedBooking(endAt: Date) {
    const { location, slotType } = await createFixtureSlotType(prisma, { capacity: 1 });
    const user = await createFixtureUser(prisma);
    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        locationId: location.id,
        slotTypeId: slotType.id,
        vehicleNumber: 'AP39AB1234',
        vehicleType: 'CAR',
        startAt: new Date(endAt.getTime() - 3_600_000),
        endAt,
        status: 'CONFIRMED',
        quotedAmount: 2000,
      },
    });
    return { booking, user, location };
  }

  it('verifies once to ACTIVE; replay is rejected as TICKET_ALREADY_USED', async () => {
    const { booking } = await createConfirmedBooking(new Date(Date.now() + 3_600_000));
    const ticket = await prisma.$transaction((tx) => ticketsService.issueForBooking(booking.id, tx));

    const first = await ticketsService.verify(STAFF_USER_ID, ticket.token);
    expect(first.booking.status).toBe('ACTIVE');

    await expect(ticketsService.verify(STAFF_USER_ID, ticket.token)).rejects.toMatchObject({
      code: 'TICKET_ALREADY_USED',
    } satisfies Partial<DomainError>);
  });

  it('rejects a token past its expiry as TICKET_EXPIRED', async () => {
    const { booking } = await createConfirmedBooking(new Date(Date.now() - 3_600_000)); // already ended
    const ticket = await prisma.$transaction((tx) => ticketsService.issueForBooking(booking.id, tx));
    // issueForBooking sets expiresAt = booking.endAt, which is already in the past here.

    await expect(ticketsService.verify(STAFF_USER_ID, ticket.token)).rejects.toMatchObject({
      code: 'TICKET_EXPIRED',
    } satisfies Partial<DomainError>);
  });

  it('exit is rejected as TICKET_ALREADY_USED on replay', async () => {
    const { booking } = await createConfirmedBooking(new Date(Date.now() + 3_600_000));
    const ticket = await prisma.$transaction((tx) => ticketsService.issueForBooking(booking.id, tx));

    await ticketsService.verify(STAFF_USER_ID, ticket.token);
    const first = await ticketsService.exit(STAFF_USER_ID, ticket.token);
    expect(first.booking.status).toBe('COMPLETED');

    await expect(ticketsService.exit(STAFF_USER_ID, ticket.token)).rejects.toMatchObject({
      code: 'TICKET_ALREADY_USED',
    } satisfies Partial<DomainError>);
  });
});
