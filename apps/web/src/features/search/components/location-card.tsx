import Link from 'next/link';
import type { LocationSummary } from '@parkap/shared';
import { formatDistance, formatINR } from '@/lib/format';
import { t } from '@/i18n/messages';
import { AvailabilityBadge } from './availability-badge';

export function LocationCard({ location }: { location: LocationSummary }) {
  const distance = formatDistance(location.distanceKm);

  return (
    <Link
      href={`/locations/${location.id}`}
      className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] p-4 transition hover:border-[var(--color-brand)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{location.name}</h3>
          <p className="text-sm text-[var(--color-muted)]">{location.address}</p>
        </div>
        <AvailabilityBadge
          locationId={location.id}
          initialAvailable={location.availability.available}
          initialTotal={location.availability.total}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-muted)]">
        {distance ? <span>{distance} away</span> : null}
        {location.walkingMinutes ? <span>{location.walkingMinutes} min walk</span> : null}
        {location.priceFrom !== null ? (
          <span>
            {t('search.priceFrom')} {formatINR(location.priceFrom)}
            {t('search.perHour')}
          </span>
        ) : null}
        {location.is24x7 ? <span>{t('location.open24x7')}</span> : null}
      </div>
      {location.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {location.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-muted)]"
            >
              {tag.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}
