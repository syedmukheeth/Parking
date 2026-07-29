'use client';

import { useEffect, useState } from 'react';
import { requestLocationSnapshot, subscribeToLocationAvailability } from '@/lib/socket';

/**
 * Starts from the server-rendered snapshot (no flash of empty state), then
 * replaces on `availability:snapshot` and merges on `availability:delta`.
 * The cached count is advisory — booking outcome always comes from the api
 * response, never this badge (parkap-frontend skill).
 */
export function AvailabilityBadge({
  locationId,
  initialAvailable,
  initialTotal,
}: {
  locationId: string;
  initialAvailable: number;
  initialTotal: number;
}) {
  const [available, setAvailable] = useState(initialAvailable);
  const [total, setTotal] = useState(initialTotal);

  useEffect(() => {
    const sub = subscribeToLocationAvailability(locationId, {
      onSnapshot: (event) => {
        const totals = event.slotTypes.reduce(
          (acc, s) => ({ available: acc.available + s.available, total: acc.total + s.capacity }),
          { available: 0, total: 0 },
        );
        setAvailable(totals.available);
        setTotal(totals.total);
      },
      onDelta: () => {
        // A delta carries one slot type's count, not the location total, and
        // this view only has the aggregate — ask for a fresh snapshot rather
        // than guess at merging a partial number into it.
        requestLocationSnapshot(locationId);
      },
    });
    return sub.unsubscribe;
  }, [locationId]);

  const isLow = total > 0 && available / total <= 0.15;
  const isFull = available <= 0;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        isFull
          ? 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'
          : isLow
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
      }`}
    >
      {isFull ? 'Full' : `${available} of ${total} free`}
    </span>
  );
}
