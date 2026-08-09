import type { Metadata } from 'next';
import { t } from '@/i18n/messages';
import { Landing } from '@/features/marketing/components/landing';
import { searchLocations } from '@/features/search/api';
import { COVERED_CITIES } from '@/features/marketing/cities';

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
 * The public landing page.
 *
 * It lives here rather than at `/` because demo mode signs every visitor in,
 * so `/` always resolves to the citizen dashboard. Restore the split in
 * app/page.tsx once demo mode is off.
 */
export default async function WelcomePage() {
  // A modest sample is enough to make the map feel alive without shipping the
  // whole catalogue to a first-time visitor.
  const results = await searchLocations({ q: 'a', limit: 40, page: 1, sort: 'availability' });
  return <Landing locations={results.items} cities={COVERED_CITIES} />;
}
