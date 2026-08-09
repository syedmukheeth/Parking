import { beforeEach, describe, expect, it, vi } from 'vitest';
import { processHoldSweep } from './hold-sweep.processor';
import { prisma } from '../prisma';

vi.mock('../prisma', () => ({
  prisma: { booking: { updateMany: vi.fn() } },
}));

const updateMany = vi.mocked(prisma.booking.updateMany);

/**
 * The sweep must only ever touch PENDING rows whose hold has already elapsed.
 * A predicate that dropped either half would expire live holds — bookings a
 * citizen is mid-payment on — so the where-clause is what's asserted.
 */
describe('processHoldSweep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('expires only PENDING bookings whose hold has already elapsed', async () => {
    updateMany.mockResolvedValue({ count: 3 } as never);
    const before = Date.now();

    await processHoldSweep();

    const args = updateMany.mock.calls[0]?.[0] as {
      where: { status: string; holdExpiresAt: { lt: Date } };
      data: { status: string };
    };
    expect(args.where.status).toBe('PENDING');
    expect(args.data.status).toBe('EXPIRED');
    // Strictly-less-than against the server clock: a hold expiring in the
    // future must not be swept.
    expect(args.where.holdExpiresAt.lt.getTime()).toBeGreaterThanOrEqual(before);
    expect(args.where.holdExpiresAt.lt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('stays quiet when nothing was stale', async () => {
    updateMany.mockResolvedValue({ count: 0 } as never);

    await processHoldSweep();

    expect(console.warn).not.toHaveBeenCalled();
  });
});
