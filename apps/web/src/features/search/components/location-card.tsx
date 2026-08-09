'use client';

import Link from 'next/link';
import { Clock, MapPin } from 'lucide-react';
import type { LocationSummary } from '@parkap/shared';
import { FavouriteButton } from '@/features/favourites/components/favourite-button';
import { formatDistance, formatINR } from '@/lib/format';
import { t, type MessageKey } from '@/i18n/messages';
import { AvailabilityBadge } from './availability-badge';

/**
 * The card is a positioned container rather than one big `<Link>` so the
 * favourite toggle can sit beside the link instead of nested inside it:
 * a `<button>` inside an `<a>` is invalid HTML and swallows the toggle's click.
 * The link keeps a stretched overlay so the whole card still navigates, and the
 * interactive controls sit above it on the z-axis.
 */
export function LocationCard({
  location,
  isFavourite,
  showFavourite = false,
  isSelected = false,
  onHover,
}: {
  location: LocationSummary;
  isFavourite?: boolean;
  /** Off for signed-out visitors: search is public, favouriting is not. */
  showFavourite?: boolean;
  /** Mirrors map selection so the two halves of discovery stay in sync. */
  isSelected?: boolean;
  onHover?: () => void;
}) {
  const distance = formatDistance(location.distanceKm);

  return (
    <div
      onMouseEnter={onHover}
      data-selected={isSelected}
      className={`relative flex flex-col gap-2.5 rounded-lg border bg-card p-4 transition-all duration-[var(--duration-fast)] focus-within:border-primary hover:border-primary hover:shadow-[var(--shadow-md)] ${
        isSelected ? 'border-primary shadow-[var(--shadow-md)]' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-h3">
            {/* Viewport prefetch is off deliberately. A search renders up to a
              * hundred of these, and the App Router default prefetches every
              * card that scrolls into view, each one a full RSC render of the
              * location page, which re-queries the api. Measured on the
              * deployed site that was 94 requests for one search, the slowest
              * taking 2.4s, all competing with the data the citizen is
              * actually waiting for. `false` still prefetches on hover, which
              * is the intent that actually predicts a click. */}
            <Link
              href={`/locations/${location.id}`}
              prefetch={false}
              className="after:absolute after:inset-0"
            >
              {location.name}
            </Link>
          </h3>
          <p className="truncate text-small text-muted-foreground">{location.address}</p>
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          <AvailabilityBadge
            locationId={location.id}
            initialAvailable={location.availability.available}
            initialTotal={location.availability.total}
          />
          {showFavourite ? (
            <FavouriteButton locationId={location.id} initialIsFavourite={isFavourite ?? false} />
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-muted-foreground">
        {location.priceFrom !== null ? (
          <span className="tabular font-medium text-foreground">
            {formatINR(location.priceFrom)}
            {t('search.perHour')}
          </span>
        ) : null}
        {distance ? (
          <span className="tabular inline-flex items-center gap-1">
            <MapPin aria-hidden="true" size={14} />
            {distance}
          </span>
        ) : null}
        {location.walkingMinutes ? (
          <span className="tabular">
            {location.walkingMinutes} {t('search.minWalk')}
          </span>
        ) : null}
        {location.is24x7 ? (
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden="true" size={14} />
            {t('location.open24x7')}
          </span>
        ) : null}
      </div>

      {location.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {location.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-caption text-secondary-foreground">
              {t(`tag.${tag}` as MessageKey)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
