import type { BookingConfirmedJobData } from '@parkap/shared';
import { prisma } from '../prisma';
import { generateTicketToken } from '../tickets/ticket-token';

/**
 * Runs after a booking is confirmed: issues the QR ticket, and logs the
 * notification/invoice stubs (real Novu/Resend/FCM and GST invoice PDFs are
 * Proposal Phase 2 — docs/ROADMAP.md). Idempotent — re-processing the same
 * booking (a retried or duplicate job) must not create a second ticket.
 */
export async function processBookingConfirmed(data: BookingConfirmedJobData, ticketTokenSecret: string): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: data.bookingId } });
  if (!booking) {
    console.warn(`[booking-confirmed] booking ${data.bookingId} not found — skipping`);
    return;
  }

  const existingTicket = await prisma.ticket.findUnique({ where: { bookingId: data.bookingId } });
  if (!existingTicket) {
    const token = generateTicketToken(data.bookingId, ticketTokenSecret);
    await prisma.ticket.create({
      data: { bookingId: data.bookingId, token, expiresAt: booking.endAt },
    });
    console.warn(`[booking-confirmed] ticket issued for booking ${data.bookingId}`);
  }

  // Stubs — Novu/Resend/FCM notifications and GST invoice PDFs are deferred
  // (Proposal Phase 2). Logging here is the seam a real job attaches to.
  console.warn(`[notification-stub] would notify user about booking ${data.bookingId}`);
  console.warn(`[invoice-stub] would generate invoice for booking ${data.bookingId}`);
}
