import type { Metadata } from 'next';
import { getSession } from '@/lib/session';
import { t } from '@/i18n/messages';
import { listMyBookings } from '@/features/bookings/api';
import { listFavourites } from '@/features/favourites/api';
import { Dashboard } from '@/features/home/components/dashboard';
import { Landing } from '@/features/marketing/components/landing';
import { COVERED_CITIES } from '@/features/marketing/cities';
import { getMe } from '@/features/profile/api';
import { searchLocations } from '@/features/search/api';

export const metadata: Metadata = {
  title: { absolute: `${t('app.name')} · ${t('app.tagline')}` },
  description: t('landing.heroBody'),
  openGraph: {
    title: `${t('app.name')} · ${t('app.tagline')}`,
    description: t('landing.heroBody'),
    type: 'website',
  },
};

/**
 * One route, two products: a signed-in citizen gets their dashboard, a visitor
 * gets the landing page. Splitting them onto separate URLs would mean either a
 * redirect on every visit or a marketing page returning users keep landing on.
 *
 * With demo mode on there is always a session, so this resolves to the
 * dashboard and the landing page lives at /welcome.
 */
export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    // Cached for a minute. This is the marketing page: the lots on it are
    // illustration, nobody books from here, and making a first-time visitor
    // wait on a cold api round trip before anything paints is the single
    // slowest thing on the site. A search that decides a booking is never
    // cached; see searchLocations' caller in /search.
    const results = await searchLocations(
      { limit: 40, page: 1, sort: 'availability' },
      { revalidateSeconds: 60 },
    );
    return <Landing locations={results.items} cities={COVERED_CITIES} />;
  }

  const [user, bookings, saved] = await Promise.all([
    getMe(),
    listMyBookings({ limit: 50, page: 1 }),
    listFavourites(),
  ]);

  return <Dashboard user={user} bookings={bookings.items} saved={saved} />;
}
