import { prisma } from '../prisma';

/**
 * Data-hygiene pass, not a correctness dependency - the capacity check
 * already excludes PENDING bookings whose hold has elapsed by reading
 * `holdExpiresAt` directly (docs/DATA-MODEL.md). This just formalises those
 * rows to EXPIRED so booking history and dashboards don't show stale PENDING
 * entries forever.
 */
export async function processHoldSweep(): Promise<void> {
  const result = await prisma.booking.updateMany({
    where: { status: 'PENDING', holdExpiresAt: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  });

  if (result.count > 0) {
    console.warn(`[hold-sweep] expired ${result.count} booking(s)`);
  }
}
