import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import type { LocationSort, VehicleType } from '@parkap/shared';
import { ApiError } from '@/lib/api';
import { EmptyState } from '@/components/state/empty-state';
import { ErrorState } from '@/components/state/error-state';
import { LoadingSkeleton } from '@/components/state/loading-skeleton';
import { t } from '@/i18n/messages';
import { searchLocations } from '@/features/search/api';
import { LocationCard } from '@/features/search/components/location-card';
import { SearchFilters } from '@/features/search/components/search-filters';

export const metadata: Metadata = { title: t('search.title') };

interface SearchPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('search.title')}</h1>
      <SearchFilters {...params} />
      <Suspense fallback={<LoadingSkeleton rows={5} />}>
        <SearchResults params={params} />
      </Suspense>
    </main>
  );
}

async function SearchResults({ params }: { params: Record<string, string | undefined> }) {
  const page = Number(params.page ?? '1') || 1;

  try {
    const result = await searchLocations({
      q: params.q || undefined,
      lat: params.lat ? Number(params.lat) : undefined,
      lng: params.lng ? Number(params.lng) : undefined,
      vehicleType: (params.vehicleType || undefined) as VehicleType | undefined,
      availableOnly: params.availableOnly === 'true',
      openNow: params.openNow === 'true',
      sort: (params.sort || 'distance') as LocationSort,
      page,
    });

    if (result.items.length === 0) {
      return <EmptyState title={t('search.noResults.title')} description={t('search.noResults.description')} />;
    }

    const totalPages = Math.max(1, Math.ceil(result.total / result.limit));

    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--color-muted)]">
          {result.total} {t('search.resultsCount')}
        </p>
        <div className="flex flex-col gap-3">
          {result.items.map((location) => (
            <LocationCard key={location.id} location={location} />
          ))}
        </div>
        {totalPages > 1 ? (
          <nav aria-label="Pagination" className="flex items-center justify-center gap-4 pt-2 text-sm">
            {page > 1 ? (
              <Link href={buildPageHref(params, page - 1)} className="underline underline-offset-2">
                ← Prev
              </Link>
            ) : null}
            <span className="text-[var(--color-muted)]">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={buildPageHref(params, page + 1)} className="underline underline-offset-2">
                Next →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    );
  } catch (error) {
    const message = error instanceof ApiError ? error.message : t('common.error');
    return <ErrorState title={t('common.error')} message={message} />;
  }
}

function buildPageHref(params: Record<string, string | undefined>, page: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && key !== 'page') search.set(key, value);
  }
  search.set('page', String(page));
  return `/search?${search.toString()}`;
}
