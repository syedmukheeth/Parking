import type { Metadata } from 'next';
import { requireSession } from '@/lib/session';
import { EmptyState } from '@/components/state/empty-state';
import { t } from '@/i18n/messages';
import { listFavourites } from '@/features/favourites/api';
import { LocationCard } from '@/features/search/components/location-card';

export const metadata: Metadata = { title: t('favourites.title') };

/**
 * Saved lots get their own route rather than a section buried in /profile —
 * this is a repeat-use surface (home, work, college), not account settings.
 */
export default async function SavedPage() {
  await requireSession();
  const favourites = await listFavourites();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-h1">{t('favourites.title')}</h1>
        <p className="text-small text-muted-foreground">{t('favourites.subtitle')}</p>
      </div>

      {favourites.length === 0 ? (
        <EmptyState
          title={t('favourites.empty.title')}
          description={t('favourites.empty.description')}
          actionHref="/search"
          actionLabel={t('favourites.empty.cta')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {favourites.map((location) => (
            <LocationCard key={location.id} location={location} isFavourite showFavourite />
          ))}
        </div>
      )}
    </main>
  );
}
