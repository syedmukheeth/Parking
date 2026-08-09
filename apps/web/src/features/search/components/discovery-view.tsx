'use client';

import { useCallback, useRef, useState } from 'react';
import type { LocationSummary } from '@parkap/shared';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { EmptyState } from '@/components/state/empty-state';
import { t } from '@/i18n/messages';
import { LazyMap } from '@/features/map/lazy-map';
import { LocationCard } from './location-card';

export interface DiscoveryViewProps {
  locations: LocationSummary[];
  favouriteIds: string[];
  showFavourites: boolean;
  resultCount: number;
}

/**
 * The map-first discovery surface.
 *
 * Two compositions, one state: desktop is a persistent split (list beside a
 * full-height map), mobile is a full-bleed map under a draggable sheet. Both
 * read the same `selectedId`, so selecting on the map highlights the card and
 * vice versa.
 *
 * Exactly ONE map instance exists, repositioned with CSS rather than rendered
 * per breakpoint. Mounting a second hidden MapLibre instance doubles the tile
 * requests, the marker DOM and the realtime subscriptions — all invisible,
 * because the duplicate is `display:none`.
 *
 * The list is rendered in both slots, which is cheap DOM and safe for
 * accessibility: the hidden copy is removed from the tree by `display:none`.
 *
 * The list — not the map — is the accessible path through the results. Markers
 * are focusable buttons too, but a screen-reader user should never have to
 * navigate a map to book a space.
 */
export function DiscoveryView({ locations, favouriteIds, showFavourites, resultCount }: DiscoveryViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const favourites = new Set(favouriteIds);
  // One id can map to two elements (desktop column + mobile sheet). Scrolling
  // the hidden one is a harmless no-op, so both are kept and both are scrolled.
  const cardRefs = useRef(new Map<string, Set<HTMLDivElement>>());

  const handleSelect = useCallback((locationId: string) => {
    setSelectedId(locationId);
    for (const el of cardRefs.current.get(locationId) ?? []) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, []);

  const registerCard = useCallback((locationId: string, el: HTMLDivElement | null) => {
    const set = cardRefs.current.get(locationId) ?? new Set<HTMLDivElement>();
    if (el) {
      set.add(el);
      cardRefs.current.set(locationId, set);
    } else {
      cardRefs.current.delete(locationId);
    }
  }, []);

  const list =
    locations.length === 0 ? (
      <EmptyState
        title={t('search.noResults.title')}
        description={t('search.noResults.description')}
        actionHref="/search"
        actionLabel={t('search.clearFilters')}
      />
    ) : (
      <div className="flex flex-col gap-3">
        <p className="tabular text-small text-muted-foreground">
          {resultCount} {t('search.resultsCount')}
        </p>
        {locations.map((location) => (
          <div key={location.id} ref={(el) => registerCard(location.id, el)}>
            <LocationCard
              location={location}
              isFavourite={favourites.has(location.id)}
              showFavourite={showFavourites}
              isSelected={location.id === selectedId}
              onHover={() => setSelectedId(location.id)}
            />
          </div>
        ))}
      </div>
    );

  return (
    <div className="relative md:grid md:h-[calc(100dvh-3.5rem)] md:grid-cols-[380px_1fr] lg:grid-cols-[420px_1fr]">
      {/* Desktop list column. */}
      <div className="hidden min-h-0 overflow-y-auto border-r border-border px-4 py-4 md:block">{list}</div>

      {/* The single map. Full-bleed behind the sheet on mobile; a grid cell on
       * desktop. */}
      <div className="fixed inset-x-0 bottom-0 top-0 z-0 md:static md:h-full">
        <LazyMap
          locations={locations}
          selectedId={selectedId}
          onSelect={handleSelect}
          className="h-full w-full"
        />
      </div>

      {/* Mobile sheet, holding the same list. */}
      <BottomSheet ariaLabel={t('search.resultsSheet')} initialSnap="half">
        {list}
      </BottomSheet>
    </div>
  );
}
