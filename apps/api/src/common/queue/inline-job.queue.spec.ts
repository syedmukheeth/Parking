import type { ModuleRef } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { InlineBookingConfirmedQueue } from './inline-job.queue';

function queueWith(issueForBooking: (id: string) => Promise<unknown>) {
  const moduleRef = { get: () => ({ issueForBooking }) } as unknown as ModuleRef;
  return new InlineBookingConfirmedQueue(moduleRef);
}

describe('InlineBookingConfirmedQueue', () => {
  it('issues the ticket in-process instead of enqueuing it', async () => {
    const issueForBooking = vi.fn().mockResolvedValue({ id: 'tkt_1' });
    await queueWith(issueForBooking).enqueue({ bookingId: 'bkg_1' });
    expect(issueForBooking).toHaveBeenCalledWith('bkg_1');
  });

  it('swallows a failure rather than failing the caller', async () => {
    // Both call sites run after their transaction commits, so the booking is
    // already CONFIRMED and the payment recorded. Throwing here would report a
    // failed payment for one that succeeded.
    const issueForBooking = vi.fn().mockRejectedValue(new Error('database is down'));
    await expect(queueWith(issueForBooking).enqueue({ bookingId: 'bkg_2' })).resolves.toBeUndefined();
  });

  it('keeps the JobQueue contract, so call sites need no branch', async () => {
    const queue = queueWith(vi.fn().mockResolvedValue({}));
    expect(typeof queue.enqueue).toBe('function');
    await expect(queue.enqueue({ bookingId: 'bkg_3' })).resolves.toBeUndefined();
  });
});
