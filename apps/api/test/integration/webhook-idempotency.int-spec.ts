import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TestingModule } from '@nestjs/testing';
import type { PaymentWebhook } from '@parkap/shared';
import type { PrismaService } from '../../src/common/prisma/prisma.service';
import { BookingsService } from '../../src/features/bookings/bookings.service';
import { createFixtureSlotType, createFixtureUser } from './fixtures';
import { hasTestDatabase, truncateAll } from './setup';
import { buildTestingModule } from './test-module';

/**
 * The same `providerPaymentId` delivered twice (a real gateway retries
 * webhooks) must confirm the booking once, not twice, and must not enqueue
 * the ticket-issue job twice (docs/API-CONTRACT.md).
 */
describe.skipIf(!hasTestDatabase)('payment webhook idempotency', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let bookingsService: BookingsService;
  const enqueue = vi.fn(async () => Promise.resolve());

  beforeEach(async () => {
    enqueue.mockClear();
    ({ moduleRef, prisma } = await buildTestingModule({ bookingConfirmedQueue: { enqueue } }));
    await truncateAll(prisma);
    bookingsService = moduleRef.get(BookingsService);
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  it('processes a replayed webhook exactly once', async () => {
    const { location, slotType } = await createFixtureSlotType(prisma, { capacity: 1 });
    const user = await createFixtureUser(prisma);

    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        locationId: location.id,
        slotTypeId: slotType.id,
        vehicleNumber: 'AP39AB1234',
        vehicleType: 'CAR',
        startAt: new Date('2026-08-01T09:00:00.000Z'),
        endAt: new Date('2026-08-01T10:00:00.000Z'),
        status: 'PENDING',
        quotedAmount: 2000,
        holdExpiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });
    const payment = await prisma.payment.create({
      data: { bookingId: booking.id, provider: 'mock', providerOrderId: 'order_test_1', amount: 2000, status: 'CREATED' },
    });

    const webhook: PaymentWebhook = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_replayed_1',
            order_id: payment.providerOrderId as string,
            amount: 2000,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    await bookingsService.handlePaymentWebhook(webhook);
    await bookingsService.handlePaymentWebhook(webhook); // replay - same providerPaymentId

    const finalBooking = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    const finalPayment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });

    expect(finalBooking.status).toBe('CONFIRMED');
    expect(finalPayment.status).toBe('SUCCESS');
    expect(finalPayment.providerPaymentId).toBe('pay_test_replayed_1');
    // Not double-enqueued - the second call short-circuits on the
    // already-processed providerPaymentId before reaching the queue.
    expect(enqueue).toHaveBeenCalledTimes(1);
  });

  it('a failed payment releases the hold without cancelling the booking', async () => {
    const { location, slotType } = await createFixtureSlotType(prisma, { capacity: 1 });
    const user = await createFixtureUser(prisma);

    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        locationId: location.id,
        slotTypeId: slotType.id,
        vehicleNumber: 'AP39AB1234',
        vehicleType: 'CAR',
        startAt: new Date('2026-08-01T09:00:00.000Z'),
        endAt: new Date('2026-08-01T10:00:00.000Z'),
        status: 'PENDING',
        quotedAmount: 2000,
        holdExpiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });
    const payment = await prisma.payment.create({
      data: { bookingId: booking.id, provider: 'mock', providerOrderId: 'order_test_2', amount: 2000, status: 'CREATED' },
    });

    await bookingsService.handlePaymentWebhook({
      event: 'payment.failed',
      payload: {
        payment: {
          entity: { id: 'pay_test_failed_1', order_id: payment.providerOrderId as string, amount: 2000, currency: 'INR', status: 'failed' },
        },
      },
    });

    const finalBooking = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    const finalPayment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });

    // Left to expire via the hold-sweep job, not cancelled outright
    // (docs/ARCHITECTURE.md §6).
    expect(finalBooking.status).toBe('PENDING');
    expect(finalPayment.status).toBe('FAILED');
    expect(enqueue).not.toHaveBeenCalled();
  });
});
