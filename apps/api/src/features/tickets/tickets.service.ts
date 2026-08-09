import { Injectable } from '@nestjs/common';
import QRCode from 'qrcode';
import type { ExitTicketResponse, TicketQrResponse, VerifyTicketResponse } from '@parkap/shared';
import { BookingRepository } from '../bookings/booking.repository';
import { assertTransition } from '../bookings/booking.state-machine';
import { resolveHourlyRule } from '../bookings/pricing.engine';
import { RealtimePublisher } from '../realtime/realtime-publisher.service';
import { DomainError } from '../../common/errors/domain-error';
import type { TxClient } from '../../common/prisma/tx-client';
import { loadEnv } from '../../config/env';
import { generateTicketToken } from './ticket-token';
import { TicketRepository } from './ticket.repository';

const MINUTES_PER_HOUR = 60;

/**
 * Imports BookingRepository from BookingsModule (one-way: tickets ->
 * bookings). BookingsModule does not import this feature back — ticket
 * ISSUANCE on payment success is queued to apps/worker (docs/ROADMAP.md
 * Phase 7), not called synchronously here, so no cycle exists.
 */
@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketRepo: TicketRepository,
    private readonly bookingRepo: BookingRepository,
    private readonly realtimePublisher: RealtimePublisher,
  ) {}

  /** Called by apps/worker's ticket-issue job consumer would duplicate this —
   * kept here too so the dev mock-confirm path (no queue round-trip) can
   * issue a ticket inline for a fast local dev loop.
   *
   * `tx` is optional: the callers that already own a transaction pass theirs,
   * and the recovery path in `getQr` has none to give. */
  async issueForBooking(bookingId: string, tx?: TxClient) {
    const booking = await this.bookingRepo.findByIdRaw(bookingId, tx);
    if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');

    const existing = await this.ticketRepo.findByBookingId(bookingId);
    if (existing) return existing; // idempotent — a ticket already exists

    const token = generateTicketToken(bookingId, loadEnv().TICKET_TOKEN_SECRET);
    return this.ticketRepo.create({ bookingId, token, expiresAt: booking.endAt }, tx);
  }

  async getQr(userId: string, bookingId: string): Promise<TicketQrResponse> {
    const booking = await this.bookingRepo.findByIdRaw(bookingId);
    if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
    if (booking.userId !== userId) {
      throw new DomainError('FORBIDDEN', 'You do not have access to this booking');
    }

    // A confirmed booking with no ticket means the issuing step has not landed
    // yet — the worker is behind, or `JOB_RUNNER=inline` ran it and failed with
    // no queue to retry it. Issuing here closes both cases. It is idempotent,
    // so racing the worker produces one ticket, not two.
    let ticket = await this.ticketRepo.findByBookingId(bookingId);
    if (!ticket && (booking.status === 'CONFIRMED' || booking.status === 'ACTIVE')) {
      ticket = await this.issueForBooking(bookingId);
    }
    if (!ticket) throw new DomainError('NOT_FOUND', 'Ticket has not been issued yet');

    const qrDataUrl = await QRCode.toDataURL(ticket.token);
    return { token: ticket.token, qrDataUrl, expiresAt: ticket.expiresAt };
  }

  /** Gate check-in. Read-and-mark-used in one transaction — that is what
   * makes replay detectable (docs/DATA-MODEL.md). */
  async verify(staffUserId: string, token: string): Promise<VerifyTicketResponse> {
    return this.bookingRepo.runInTransaction(async (tx) => {
      const ticket = await this.ticketRepo.findByTokenWithBooking(token, tx);
      if (!ticket) throw new DomainError('NOT_FOUND', 'Ticket not found');
      if (ticket.usedAt) throw new DomainError('TICKET_ALREADY_USED', 'This ticket has already been used');
      if (new Date() > ticket.expiresAt) {
        throw new DomainError('TICKET_EXPIRED', 'This ticket is no longer valid');
      }

      assertTransition(ticket.booking.status, 'ACTIVE');

      await this.ticketRepo.markCheckedIn(ticket.id, staffUserId, tx);
      const booking = await this.bookingRepo.updateStatus(ticket.booking.id, 'ACTIVE', {}, tx);

      await this.realtimePublisher.publishAvailabilityDelta(ticket.booking.slotTypeId);
      this.realtimePublisher.emitBookingUpdated(ticket.booking.userId, booking.id, 'ACTIVE');

      return {
        ok: true,
        booking: {
          id: booking.id,
          status: 'ACTIVE',
          vehicleNumber: booking.vehicleNumber,
          endAt: booking.endAt,
        },
        location: { id: ticket.booking.location.id, name: ticket.booking.location.name },
      };
    });
  }

  /** Gate check-out. Charges overstay when the vehicle exits after `endAt` —
   * `endAt` itself is never rewritten, only the amount owed grows. */
  async exit(staffUserId: string, token: string): Promise<ExitTicketResponse> {
    return this.bookingRepo.runInTransaction(async (tx) => {
      const ticket = await this.ticketRepo.findByTokenWithBooking(token, tx);
      if (!ticket) throw new DomainError('NOT_FOUND', 'Ticket not found');
      if (!ticket.usedAt) throw new DomainError('TICKET_EXPIRED', 'This ticket has not been checked in yet');
      if (ticket.checkedOutAt) {
        throw new DomainError('TICKET_ALREADY_USED', 'This ticket has already exited');
      }

      assertTransition(ticket.booking.status, 'COMPLETED');

      const now = new Date();
      let overstay: ExitTicketResponse['overstay'] = null;

      if (now.getTime() > ticket.booking.endAt.getTime()) {
        const overstayMinutes = Math.ceil((now.getTime() - ticket.booking.endAt.getTime()) / 60_000);
        const slotType = await this.bookingRepo.getSlotTypeWithPricing(ticket.booking.slotTypeId, tx);
        const rule = slotType ? resolveHourlyRule(slotType.pricingRules, ticket.booking.endAt) : undefined;
        const overstayAmount = rule ? Math.ceil(overstayMinutes / MINUTES_PER_HOUR) * rule.baseAmount : 0;

        if (overstayAmount > 0) {
          await this.bookingRepo.addOverstayCharge(ticket.booking.id, overstayAmount, tx);
        }
        overstay = { minutes: overstayMinutes, amount: overstayAmount };
      }

      await this.ticketRepo.markCheckedOut(ticket.id, staffUserId, tx);
      const booking = await this.bookingRepo.updateStatus(ticket.booking.id, 'COMPLETED', {}, tx);

      await this.realtimePublisher.publishAvailabilityDelta(ticket.booking.slotTypeId);
      this.realtimePublisher.emitBookingUpdated(ticket.booking.userId, booking.id, 'COMPLETED');

      return { ok: true, booking: { id: booking.id, status: booking.status }, overstay };
    });
  }
}
