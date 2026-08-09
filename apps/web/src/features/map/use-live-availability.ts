'use client';

import { useEffect, useState } from 'react';
import { requestLocationSnapshot, subscribeToLocationAvailability } from '@/lib/socket';

export interface LiveCount {
  available: number;
  total: number;
}

/**
 * Subscribes to availability for a bounded set of locations at once.
 *
 * Reuses the same per-location socket contract the badges use, snapshot
 * replaces, delta triggers a re-request, rather than inventing a bulk
 * channel. The caller is responsible for keeping the id list small
 * (MAX_LIVE_MARKERS); this hook opens one subscription per id.
 *
 * Returns counts keyed by location id. Ids with no data yet are simply absent,
 * so callers fall back to their server-rendered snapshot instead of rendering
 * a zero, a marker briefly claiming "0 free" would read as a full lot.
 */
export function useLiveAvailability(locationIds: string[]): Record<string, LiveCount> {
  const [counts, setCounts] = useState<Record<string, LiveCount>>({});
  // Sorted join, so re-ordering the same set doesn't tear down every socket.
  const key = [...locationIds].sort().join(',');

  useEffect(() => {
    if (!key) {
      setCounts({});
      return;
    }

    const subscriptions = key.split(',').map((locationId) =>
      subscribeToLocationAvailability(locationId, {
        onSnapshot: (event) => {
          const totals = event.slotTypes.reduce(
            (acc, slot) => ({
              available: acc.available + slot.available,
              total: acc.total + slot.capacity,
            }),
            { available: 0, total: 0 },
          );
          setCounts((prev) => ({ ...prev, [locationId]: totals }));
        },
        onDelta: () => {
          // A delta carries one slot type, not the location aggregate. The
          // subscribe handler always answers with a fresh snapshot, so asking
          // again is cheaper than trying to merge a partial number correctly.
          requestLocationSnapshot(locationId);
        },
      }),
    );

    return () => {
      for (const sub of subscriptions) sub.unsubscribe();
    };
  }, [key]);

  return counts;
}
