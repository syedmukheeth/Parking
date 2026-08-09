'use client';

import { useEffect, useState } from 'react';
import type { LocationDetail } from '@parkap/shared';
import { t } from '@/i18n/messages';
import { AVAILABILITY_CLASSES, availabilityStatus } from '@/lib/availability';
import { requestLocationSnapshot, subscribeToLocationAvailability } from '@/lib/socket';

/**
 * The number a citizen actually came for, at the size that implies.
 *
 * Live over the socket, seeded from the server render so there's no flash of
 * an empty count. Still advisory, this figure never gates a booking; the
 * transactional capacity check does (CLAUDE.md).
 */
export function AvailabilityHero({ location }: { location: LocationDetail }) {
  const seed = location.slotTypes.reduce(
    (acc, slot) => ({ available: acc.available + slot.available, total: acc.total + slot.capacity }),
    { available: 0, total: 0 },
  );
  const [counts, setCounts] = useState(seed);

  useEffect(() => {
    const sub = subscribeToLocationAvailability(location.id, {
      onSnapshot: (event) =>
        setCounts(
          event.slotTypes.reduce(
            (acc, slot) => ({
              available: acc.available + slot.available,
              total: acc.total + slot.capacity,
            }),
            { available: 0, total: 0 },
          ),
        ),
      onDelta: () => requestLocationSnapshot(location.id),
    });
    return sub.unsubscribe;
  }, [location.id]);

  const status = availabilityStatus(counts.available, counts.total);

  return (
    <div className="flex items-end gap-4">
      <div>
        {/* aria-live so a screen reader hears the count change rather than
         * silently going stale while the citizen decides. */}
        <p className="tabular text-data-lg" aria-live="polite">
          {counts.available}
        </p>
        <p className="text-small text-muted-foreground">
          {t('availability.spaces')} · {counts.total} {t('location.total')}
        </p>
      </div>
      <span
        className={`mb-1 rounded-full px-2.5 py-1 text-caption font-medium ${AVAILABILITY_CLASSES[status].subtle}`}
      >
        {t(`availability.${status}`)}
      </span>
    </div>
  );
}
