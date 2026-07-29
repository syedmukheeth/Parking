/**
 * BullMQ queue names — the contract between apps/api (producer) and
 * apps/worker (consumer). They're independently-deployed processes, so the
 * name string is the only thing that has to agree; job payload shapes are
 * documented alongside each name below rather than as Zod schemas, since
 * these never cross a client-facing boundary.
 */
export const QUEUE_NAMES = {
  /** { bookingId: string } — issues the ticket, logs the notification and
   * invoice stubs. Enqueued once a payment confirms a booking. */
  bookingConfirmed: 'booking-confirmed',
  /** {} — repeatable job. Sweeps PENDING bookings whose hold has elapsed to
   * EXPIRED; a data-hygiene pass, not a correctness dependency (the capacity
   * check already excludes expired holds by reading `holdExpiresAt` itself). */
  holdSweep: 'hold-sweep',
} as const;

export interface BookingConfirmedJobData {
  bookingId: string;
}
