import type { Booking } from '@parkap/shared';

/**
 * Usage stats, derived from the citizen's real bookings.
 *
 * Deliberately three honest numbers. The brief suggested a "hours saved"
 * figure, which would require knowing how long they would have circled looking
 * for a space — the app has no such data, so inventing it would be a made-up
 * statistic presented as a measurement.
 *
 * Only terminal, actually-paid states count. Counting a PENDING hold as spend
 * would inflate the total and then silently deflate it when the hold expires.
 */
const COUNTED_STATUSES = new Set(['CONFIRMED', 'ACTIVE', 'COMPLETED']);

export interface UsageStats {
  sessions: number;
  /** Integer paise, never a float — money math stays exact (CLAUDE.md). */
  totalPaise: number;
  totalMinutes: number;
}

export function usageStats(bookings: readonly Booking[]): UsageStats {
  return bookings.reduce<UsageStats>(
    (acc, booking) => {
      if (!COUNTED_STATUSES.has(booking.status)) return acc;

      const start = new Date(booking.startAt).getTime();
      const end = new Date(booking.endAt).getTime();
      const minutes = Math.max(0, Math.round((end - start) / 60_000));

      return {
        sessions: acc.sessions + 1,
        totalPaise: acc.totalPaise + (booking.finalAmount ?? booking.quotedAmount),
        totalMinutes: acc.totalMinutes + minutes,
      };
    },
    { sessions: 0, totalPaise: 0, totalMinutes: 0 },
  );
}

/** The booking to surface at the top of the home screen: an active session
 * first, then the soonest upcoming one. */
export function activeOrNextBooking(bookings: readonly Booking[]): Booking | undefined {
  const active = bookings.find((booking) => booking.status === 'ACTIVE');
  if (active) return active;

  const now = Date.now();
  return bookings
    .filter((booking) => booking.status === 'CONFIRMED' && new Date(booking.endAt).getTime() > now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
}
