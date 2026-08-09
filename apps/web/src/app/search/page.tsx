import type { Metadata } from 'next';
import { Suspense } from 'react';
import type { LocationSort, VehicleType } from '@parkap/shared';
import { ApiError } from '@/lib/api';
import { getSession } from '@/lib/session';
import { ErrorState } from '@/components/state/error-state';
import { LoadingSkeleton } from '@/components/state/loading-skeleton';
import { t } from '@/i18n/messages';
import { favouriteIds } from '@/features/favourites/api';
import { searchLocations } from '@/features/search/api';
import { DiscoveryView } from '@/features/search/components/discovery-view';
import { SearchFilters } from '@/features/search/components/search-filters';

export const metadata: Metadata = {
  title: t('search.title'),
  description: t('search.metaDescription'),
};

interface SearchPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

/**
 * Map-first discovery. The page shell stays a Server Component, the search
 * form still works as a plain GET with no JavaScript, and only the
 * map/list/sheet composition below it is client-side.
 *
 * A high limit is deliberate: the map wants every matching lot as a marker,
 * not one page of twenty. Pagination belongs to a list-only view.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  return (
    <main className="flex flex-col">
      <div className="border-b border-border px-4 py-3 sm:px-6">
        <h1 className="sr-only">{t('search.title')}</h1>
        <SearchFilters {...params} />
      </div>

      <Suspense
        fallback={
          <div className="px-4 py-6 sm:px-6">
            <LoadingSkeleton rows={5} />
          </div>
        }
      >
        <SearchResults params={params} />
      </Suspense>
    </main>
  );
}

async function SearchResults({ params }: { params: Record<string, string | undefined> }) {
  const q = params.q || undefined;
  const lat = params.lat ? Number(params.lat) : undefined;
  const lng = params.lng ? Number(params.lng) : undefined;

  // Distance sort needs an origin: either coordinates or a text query to
  // anchor on. Bare `/search` has neither, and asking for it anyway is a
  // VALIDATION_FAILED from the api rather than an empty list, so fall back to
  // the sort that always makes sense with no origin.
  const hasOrigin = Boolean(q || (lat !== undefined && lng !== undefined));
  const requestedSort = (params.sort || 'distance') as LocationSort;
  const sort: LocationSort = requestedSort === 'distance' && !hasOrigin ? 'availability' : requestedSort;

  try {
    const [result, favourites, session] = await Promise.all([
      searchLocations({
        q,
        lat,
        lng,
        vehicleType: (params.vehicleType || undefined) as VehicleType | undefined,
        availableOnly: params.availableOnly === 'true',
        openNow: params.openNow === 'true',
        sort,
        page: 1,
        limit: 100,
      }),
      favouriteIds(),
      getSession(),
    ]);

    return (
      <DiscoveryView
        locations={result.items}
        favouriteIds={[...favourites]}
        showFavourites={Boolean(session)}
        resultCount={result.total}
      />
    );
  } catch (error) {
    // A rejected filter combination is not a lost connection, and telling the
    // citizen it is sends them to check their wifi over a bad dropdown.
    const isValidation = error instanceof ApiError && error.code === 'VALIDATION_FAILED';
    return (
      <div className="px-4 py-8 sm:px-6">
        <ErrorState
          title={isValidation ? t('error.badFilters.title') : t('error.network.title')}
          message={isValidation ? t('error.badFilters.description') : t('error.network.description')}
          retryHref="/search"
          retryLabel={isValidation ? t('search.clearFilters') : t('common.retry')}
        />
      </div>
    );
  }
}
