import type { BookingConfirmedJobData } from '@parkap/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { processBookingConfirmed } from './booking-confirmed.processor';
import { prisma } from '../prisma';

vi.mock('../prisma', () => ({
  prisma: {
    booking: { findUnique: vi.fn() },
    ticket: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

const bookingFindUnique = vi.mocked(prisma.booking.findUnique);
const ticketFindUnique = vi.mocked(prisma.ticket.findUnique);
const ticketCreate = vi.mocked(prisma.ticket.create);

const SECRET = 'worker-spec-secret-not-used-in-prod';
const JOB: BookingConfirmedJobData = { bookingId: 'bkg_123' };
const END_AT = new Date('2026-08-08T12:00:00.000Z');

/**
 * BullMQ retries and a webhook that fires twice both land here as a repeated
 * job for the same bookingId. Issuing a second ticket would hand the citizen
 * two scannable QRs for one paid booking, so idempotency is the property under
 * test — not the happy path.
 */
describe('processBookingConfirmed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('issues a ticket expiring at the booking end for a first-time job', async () => {
    bookingFindUnique.mockResolvedValue({ id: JOB.bookingId, endAt: END_AT } as never);
    ticketFindUnique.mockResolvedValue(null);

    await processBookingConfirmed(JOB, SECRET);

    expect(ticketCreate).toHaveBeenCalledTimes(1);
    const created = ticketCreate.mock.calls[0]?.[0]?.data as { bookingId: string; token: string; expiresAt: Date };
    expect(created.bookingId).toBe(JOB.bookingId);
    expect(created.expiresAt).toBe(END_AT);
    expect(created.token.split('.')[0]).toBe(JOB.bookingId);
  });

  it('does not issue a second ticket when the job is replayed', async () => {
    bookingFindUnique.mockResolvedValue({ id: JOB.bookingId, endAt: END_AT } as never);
    ticketFindUnique.mockResolvedValue({ id: 'tkt_1', bookingId: JOB.bookingId } as never);

    await processBookingConfirmed(JOB, SECRET);

    expect(ticketCreate).not.toHaveBeenCalled();
  });

  it('skips a booking that no longer exists rather than throwing', async () => {
    bookingFindUnique.mockResolvedValue(null);

    await expect(processBookingConfirmed(JOB, SECRET)).resolves.toBeUndefined();
    expect(ticketFindUnique).not.toHaveBeenCalled();
    expect(ticketCreate).not.toHaveBeenCalled();
  });
});
