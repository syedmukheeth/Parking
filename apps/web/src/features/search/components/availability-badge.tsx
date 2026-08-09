'use client';

import { useEffect, useState } from 'react';
import { t } from '@/i18n/messages';
import { AVAILABILITY_CLASSES, availabilityStatus } from '@/lib/availability';
import { requestLocationSnapshot, subscribeToLocationAvailability } from '@/lib/socket';

/**
 * Starts from the server-rendered snapshot (no flash of empty state), then
 * replaces on `availability:snapshot` and merges on `availability:delta`.
 * The cached count is advisory, booking outcome always comes from the api
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
        // this view only has the aggregate, ask for a fresh snapshot rather
        // than guess at merging a partial number into it.
        requestLocationSnapshot(locationId);
      },
    });
    return sub.unsubscribe;
  }, [locationId]);

  const status = availabilityStatus(available, total);

  return (
    <span
      className={`tabular inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium ${AVAILABILITY_CLASSES[status].subtle}`}
    >
      {status === 'full' ? t('availability.full') : `${available} ${t('availability.free')}`}
    </span>
  );
}
