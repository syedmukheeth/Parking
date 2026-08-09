import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type {
  Booking,
  BookingConfirmedJobData,
  BookingDetail,
  CancelBookingRequest,
  CreateBookingRequest,
  CreateBookingResponse,
  ExtendBookingRequest,
  ListMyBookingsQuery,
  Paginated,
  Payment as PaymentDto,
  PaymentWebhook,
  QuoteRequest,
  QuoteResponse,
} from '@parkap/shared';
import { DomainError } from '../../common/errors/domain-error';
import type { TxClient } from '../../common/prisma/tx-client';
import { BOOKING_CONFIRMED_QUEUE, type JobQueue } from '../../common/queue/queue.interface';
import { loadEnv } from '../../config/env';
import { PaymentRepository } from '../payments/payment.repository';
import { PaymentsService } from '../payments/payments.service';
import { RealtimePublisher } from '../realtime/realtime-publisher.service';
import { BookingHoldStore } from './booking-hold.store';
import { BookingRepository, type BookingDetailRow } from './booking.repository';
import { assertTransition } from './booking.state-machine';
import { quoteExtension, quoteWindow } from './pricing.engine';

const QUOTE_TTL_MINUTES = 5;
const MAX_SERIALIZATION_RETRIES = 3;

function isSerializationFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string } | undefined)?.code;
  return code === '40001' || /could not serialize access/i.test(message);
}

interface BookingRow {
  id: string;
  userId: string;
  locationId: string;
  slotTypeId: string;
  vehicleNumber: string;
  vehicleType: string;
  startAt: Date;
  endAt: Date;
  status: string;
  quotedAmount: number;
  finalAmount: number | null;
  holdExpiresAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
}

function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    userId: row.userId,
    locationId: row.locationId,
    slotTypeId: row.slotTypeId,
    vehicleNumber: row.vehicleNumber,
    vehicleType: row.vehicleType as Booking['vehicleType'],
    startAt: row.startAt,
    endAt: row.endAt,
    status: row.status as Booking['status'],
    quotedAmount: row.quotedAmount,
    finalAmount: row.finalAmount,
    holdExpiresAt: row.holdExpiresAt,
    cancelledAt: row.cancelledAt,
    cancelReason: row.cancelReason,
    createdAt: row.createdAt,
  };
}

interface PaymentRow {
  id: string;
  bookingId: string;
  provider: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  amount: number;
  status: string;
  paidAt: Date | null;
}

function toBookingDetail(row: BookingDetailRow): BookingDetail {
  const latestPayment = row.payments[0];
  return {
    ...toBooking(row),
    payment: latestPayment ? toPayment(latestPayment) : null,
    ticket: row.ticket
      ? {
          id: row.ticket.id,
          issuedAt: row.ticket.issuedAt,
          expiresAt: row.ticket.expiresAt,
          usedAt: row.ticket.usedAt,
          checkedInAt: row.ticket.checkedInAt,
          checkedOutAt: row.ticket.checkedOutAt,
        }
      : null,
  };
}

function toPayment(row: PaymentRow): PaymentDto {
  return {
    id: row.id,
    bookingId: row.bookingId,
    provider: row.provider as PaymentDto['provider'],
    providerOrderId: row.providerOrderId,
    providerPaymentId: row.providerPaymentId,
    amount: row.amount,
    status: row.status as PaymentDto['status'],
    paidAt: row.paidAt,
  };
}

/**
 * Owns the booking lifecycle end to end: quote, reserve (+ open a payment
 * order), cancel, extend, and confirming/failing from a payment outcome. This
 * is the one place that imports both BookingRepository (own) and
 * PaymentRepository/PaymentsService (imported from PaymentsModule) - a
 * one-way dependency that keeps the module graph acyclic (payments knows
 * nothing about bookings).
 */
@Injectable()
export class BookingsService {
  constructor(
    private readonly repo: BookingRepository,
    private readonly holdStore: BookingHoldStore,
    private readonly paymentRepo: PaymentRepository,
    private readonly paymentsService: PaymentsService,
    private readonly realtimePublisher: RealtimePublisher,
    @Inject(BOOKING_CONFIRMED_QUEUE) private readonly bookingConfirmedQueue: JobQueue<BookingConfirmedJobData>,
  ) {}

  async quote(input: QuoteRequest): Promise<QuoteResponse> {
    const slotType = await this.repo.getSlotTypeWithPricing(input.slotTypeId);
    if (!slotType || slotType.locationId !== input.locationId) {
      throw new DomainError('NOT_FOUND', 'Slot type not found for this location');
    }

    const now = new Date();
    const occupied = await this.repo.countOverlapping(input.slotTypeId, input.startAt, input.endAt, now);
    const available = Math.max(0, slotType.capacity - occupied);

    const { amount, breakdown } = quoteWindow(slotType.pricingRules, input.startAt, input.endAt);

    return {
      amount,
      currency: 'INR',
      breakdown,
      available,
      quoteExpiresAt: new Date(now.getTime() + QUOTE_TTL_MINUTES * 60_000),
    };
  }

  async create(userId: string, input: CreateBookingRequest): Promise<CreateBookingResponse> {
    const holdTtlMinutes = loadEnv().BOOKING_HOLD_TTL_MINUTES;

    for (let attempt = 0; attempt <= MAX_SERIALIZATION_RETRIES; attempt += 1) {
      try {
        return await this.repo.runInTransaction(async (tx) => {
          const now = new Date();
          const slotType = await this.repo.getSlotTypeWithPricing(input.slotTypeId, tx);
          if (!slotType || slotType.locationId !== input.locationId) {
            throw new DomainError('NOT_FOUND', 'Slot type not found for this location');
          }

          const occupied = await this.repo.countOverlapping(
            input.slotTypeId,
            input.startAt,
            input.endAt,
            now,
            tx,
          );
          if (occupied >= slotType.capacity) {
            throw new DomainError('SLOT_UNAVAILABLE', 'No slots available for the selected time', {
              available: 0,
            });
          }

          const { amount } = quoteWindow(slotType.pricingRules, input.startAt, input.endAt);
          const holdExpiresAt = new Date(now.getTime() + holdTtlMinutes * 60_000);

          const booking = await this.repo.create(
            {
              userId,
              locationId: input.locationId,
              slotTypeId: input.slotTypeId,
              vehicleNumber: input.vehicleNumber,
              vehicleType: input.vehicleType as Prisma.BookingCreateInput['vehicleType'],
              startAt: input.startAt,
              endAt: input.endAt,
              quotedAmount: amount,
              holdExpiresAt,
            },
            tx,
          );

          await this.holdStore.acquire(booking.id, input.slotTypeId, holdTtlMinutes);

          const payment = await this.paymentsService.openOrder(booking.id, amount, tx);

          return {
            booking: {
              id: booking.id,
              status: 'PENDING',
              startAt: booking.startAt,
              endAt: booking.endAt,
              quotedAmount: booking.quotedAmount,
              holdExpiresAt,
            },
            payment: toPayment(payment),
          };
        });
      } catch (error) {
        if (isSerializationFailure(error) && attempt < MAX_SERIALIZATION_RETRIES) continue;
        throw error;
      }
    }

    // Unreachable, the loop above always returns or throws, but keeps TS
    // satisfied that every path returns.
    throw new DomainError('SLOT_UNAVAILABLE', 'Could not complete the reservation, please try again');
  }

  async getById(userId: string, role: string, id: string): Promise<BookingDetail> {
    const booking = await this.repo.findByIdWithDetail(id);
    if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
    // Only the owner or an ADMIN may view a booking's detail. There is no
    // location->operator->user linkage in this slice, so OPERATOR is
    // deliberately NOT granted blanket access here (that would let any
    // operator read any citizen's booking) - operators only get scoped
    // check-in/check-out actions via the tickets feature.
    if (booking.userId !== userId && role !== 'ADMIN') {
      throw new DomainError('FORBIDDEN', 'You do not have access to this booking');
    }
    return toBookingDetail(booking);
  }

  async listMine(userId: string, query: ListMyBookingsQuery): Promise<Paginated<Booking>> {
    const { items, total } = await this.repo.findMine(userId, {
      status: query.status,
      upcoming: query.upcoming,
      page: query.page,
      limit: query.limit,
    });
    return { items: items.map(toBooking), page: query.page, limit: query.limit, total };
  }

  async cancel(userId: string, id: string, input: CancelBookingRequest): Promise<Booking> {
    const booking = await this.repo.findByIdRaw(id);
    if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
    if (booking.userId !== userId) throw new DomainError('FORBIDDEN', 'You do not have access to this booking');

    assertTransition(booking.status, 'CANCELLED');

    const updated = await this.repo.updateStatus(id, 'CANCELLED', {
      cancelledAt: new Date(),
      cancelReason: input.reason ?? null,
    });
    await this.holdStore.release(id);
    await this.realtimePublisher.publishAvailabilityDelta(booking.slotTypeId);
    this.realtimePublisher.emitBookingUpdated(userId, id, 'CANCELLED');
    return toBooking(updated);
  }

  async extend(
    userId: string,
    id: string,
    input: ExtendBookingRequest,
  ): Promise<{ booking: Booking; payment: PaymentDto }> {
    for (let attempt = 0; attempt <= MAX_SERIALIZATION_RETRIES; attempt += 1) {
      try {
        return await this.repo.runInTransaction(async (tx) => {
          const booking = await this.repo.findByIdRaw(id, tx);
          if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
          if (booking.userId !== userId) {
            throw new DomainError('FORBIDDEN', 'You do not have access to this booking');
          }
          if (booking.status !== 'CONFIRMED' && booking.status !== 'ACTIVE') {
            throw new DomainError('INVALID_TRANSITION', 'Only a confirmed or active booking can be extended');
          }
          if (input.newEndAt.getTime() <= booking.endAt.getTime()) {
            throw new DomainError('VALIDATION_FAILED', 'newEndAt must be after the current endAt');
          }

          const now = new Date();
          // Re-checks capacity for the ADDED interval only - extension can
          // legitimately fail here; that's a normal outcome, not an error state
          // (docs/API-CONTRACT.md).
          const occupied = await this.repo.countOverlapping(
            booking.slotTypeId,
            booking.endAt,
            input.newEndAt,
            now,
            tx,
          );
          const slotType = await this.repo.getSlotTypeWithPricing(booking.slotTypeId, tx);
          if (!slotType) throw new DomainError('NOT_FOUND', 'Slot type not found');
          if (occupied >= slotType.capacity) {
            throw new DomainError('SLOT_UNAVAILABLE', 'The extension window is not available', {
              available: 0,
            });
          }

          const { amount: extraAmount } = quoteExtension(slotType.pricingRules, booking.endAt, input.newEndAt);
          // Running total across possibly-multiple extensions, not just this one.
          const finalAmount = (booking.finalAmount ?? booking.quotedAmount) + extraAmount;

          const updatedBooking = await this.repo.updateEndAtAndAmount(id, input.newEndAt, finalAmount, tx);
          const payment = await this.paymentsService.openOrder(id, extraAmount, tx);

          return {
            booking: toBooking(updatedBooking),
            payment: toPayment(payment),
          };
        });
      } catch (error) {
        if (isSerializationFailure(error) && attempt < MAX_SERIALIZATION_RETRIES) continue;
        throw error;
      }
    }

    throw new DomainError('SLOT_UNAVAILABLE', 'Could not complete the extension, please try again');
  }

  /** Dev-only shortcut - registered only when PAYMENT_PROVIDER=mock
   * (docs/API-CONTRACT.md). Idempotent: calling it again on an already-SUCCESS
   * payment is a no-op. Called from the citizen's own browser (unlike the
   * webhook, which is server-to-server and unauthenticated), so it still
   * checks booking ownership. */
  async confirmMockPayment(userId: string, paymentId: string): Promise<{ booking: Booking; payment: PaymentDto }> {
    if (loadEnv().PAYMENT_PROVIDER !== 'mock') {
      throw new DomainError('NOT_FOUND', 'Not found');
    }

    const { result, confirmed } = await this.repo.runInTransaction(async (tx) => {
      const payment = await this.paymentRepo.findById(paymentId, tx);
      if (!payment) throw new DomainError('NOT_FOUND', 'Payment not found');

      const owningBooking = await this.repo.findByIdRaw(payment.bookingId, tx);
      if (!owningBooking || owningBooking.userId !== userId) {
        throw new DomainError('FORBIDDEN', 'You do not have access to this payment');
      }

      if (payment.status === 'SUCCESS') {
        return { result: { booking: toBooking(owningBooking), payment: toPayment(payment) }, confirmed: null };
      }

      const providerPaymentId = `mock_${randomUUID()}`;
      const updatedPayment = await this.paymentsService.markSuccess(payment.id, providerPaymentId, {}, tx);
      const booking = await this.confirmBookingForPayment(payment.bookingId, tx);
      return {
        result: { booking: toBooking(booking), payment: toPayment(updatedPayment) },
        confirmed: booking,
      };
    });

    // Enqueued/published after the transaction commits - neither a job nor a
    // socket emit should depend on a transaction that could still be in
    // flight (docs/ARCHITECTURE.md §2).
    if (confirmed) {
      await this.bookingConfirmedQueue.enqueue({ bookingId: confirmed.id });
      await this.realtimePublisher.publishAvailabilityDelta(confirmed.slotTypeId);
      this.realtimePublisher.emitBookingUpdated(confirmed.userId, confirmed.id, 'CONFIRMED');
    }
    return result;
  }

  /** Public webhook, shaped like Razorpay's. Idempotent by `providerPaymentId`
   * - gateways retry, and a non-idempotent handler would double-issue tickets
   * (docs/API-CONTRACT.md). */
  async handlePaymentWebhook(body: PaymentWebhook): Promise<{ ok: true }> {
    const entity = body.payload.payment.entity;

    const confirmed = await this.repo.runInTransaction(async (tx) => {
      const alreadyProcessed = await this.paymentRepo.findByProviderPaymentId(entity.id, tx);
      if (alreadyProcessed) {
        return null; // replay of an event we've already applied
      }

      const payment = await this.paymentRepo.findByProviderOrderId(entity.order_id, tx);
      if (!payment) throw new DomainError('NOT_FOUND', 'Unknown payment order');

      if (body.event === 'payment.captured') {
        await this.paymentsService.markSuccess(payment.id, entity.id, body as unknown as Prisma.InputJsonValue, tx);
        return this.confirmBookingForPayment(payment.bookingId, tx);
      }

      await this.paymentsService.markFailed(payment.id, body as unknown as Prisma.InputJsonValue, tx);
      await this.holdStore.release(payment.bookingId);
      return null;
    });

    if (confirmed) {
      await this.bookingConfirmedQueue.enqueue({ bookingId: confirmed.id });
      await this.realtimePublisher.publishAvailabilityDelta(confirmed.slotTypeId);
      this.realtimePublisher.emitBookingUpdated(confirmed.userId, confirmed.id, 'CONFIRMED');
    }
    return { ok: true };
  }

  private async confirmBookingForPayment(bookingId: string, tx: TxClient): Promise<BookingRow> {
    const booking = await this.repo.findByIdRaw(bookingId, tx);
    if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
    if (booking.status !== 'PENDING') {
      // Already confirmed by a racing confirm/webhook call - idempotent no-op.
      return booking as BookingRow;
    }
    assertTransition(booking.status, 'CONFIRMED');
    const updated = await this.repo.updateStatus(bookingId, 'CONFIRMED', { holdExpiresAt: null }, tx);
    await this.holdStore.release(bookingId);
    return updated as BookingRow;
  }
}
