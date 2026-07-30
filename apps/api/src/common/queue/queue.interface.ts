/**
 * Producer-side seam. apps/api enqueues; only apps/worker consumes
 * (docs/ARCHITECTURE.md §2). A service depends on "a place to put jobs," not
 * on BullMQ's API surface directly — that's what makes it swappable/testable.
 */
export const BOOKING_CONFIRMED_QUEUE = Symbol('BOOKING_CONFIRMED_QUEUE');

export interface JobQueue<T> {
  enqueue(data: T): Promise<void>;
}
