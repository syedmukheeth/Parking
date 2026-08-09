import { Logger } from '@nestjs/common';
import type { ModuleRef } from '@nestjs/core';
import type { BookingConfirmedJobData } from '@parkap/shared';
import { TicketsService } from '../../features/tickets/tickets.service';
import type { JobQueue } from './queue.interface';

/**
 * Runs the booking-confirmed work in the api process instead of handing it to
 * apps/worker. Selected by `JOB_RUNNER=inline`, for deployments with nowhere
 * to host a long-running worker.
 *
 * This exists as a `JobQueue` implementation rather than a branch inside
 * BookingsService on purpose: the call sites keep saying "put this work
 * somewhere", and the worker can be reattached by changing one env var, with
 * no service code touched.
 *
 * What is genuinely lost versus the queue: BullMQ's retries and its
 * dead-letter queue. A failure here is logged and the booking stays confirmed
 * without a ticket, which is why TicketsService.getQr issues one lazily when
 * it finds a confirmed booking with no ticket. That recovery path is what
 * makes swallowing the error safe rather than negligent.
 */
export class InlineBookingConfirmedQueue implements JobQueue<BookingConfirmedJobData> {
  private readonly logger = new Logger(InlineBookingConfirmedQueue.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  async enqueue(data: BookingConfirmedJobData): Promise<void> {
    try {
      // Resolved lazily. TicketsService pulls in BookingsModule, and this
      // queue is provided by a @Global module that BookingsModule depends on:
      // taking it as a constructor dependency would make the container
      // instantiate that ring at boot.
      const tickets = this.moduleRef.get(TicketsService, { strict: false });
      await tickets.issueForBooking(data.bookingId);
      this.logger.log(`ticket issued inline for booking ${data.bookingId}`);
    } catch (error) {
      // Deliberately not rethrown. Both call sites run after their transaction
      // has committed, so the booking is already CONFIRMED and the payment is
      // already recorded; failing the response here would tell the citizen the
      // payment failed when it did not.
      this.logger.error(
        `inline booking-confirmed failed for ${data.bookingId}: the ticket will be issued when the pass is opened`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
