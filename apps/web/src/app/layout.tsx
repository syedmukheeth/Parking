import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { BRAND_HEX } from '@/config/brand';
import { BottomNav } from '@/components/layout/bottom-nav';
import { NavHeader } from '@/components/layout/nav-header';
import { t } from '@/i18n/messages';
import { getSession, isDemoMode } from '@/lib/session';
import './globals.css';

/**
 * One family for the whole product. Inter's tabular figures are the reason —
 * availability counts and prices change constantly, and a proportional `1`
 * makes the number jitter every time a slot frees up.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${t('app.name')} — ${t('app.tagline')}`,
    template: `%s · ${t('app.name')}`,
  },
  description: t('app.tagline'),
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: BRAND_HEX.primaryLight,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-sm focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          {t('a11y.skipToContent')}
        </a>
        <NavHeader session={session} demoMode={isDemoMode()} />
        {/* Clears the fixed mobile bottom bar. Map pages opt out with their
         * own full-height layout, so this is padding on the body rather than
         * a wrapper that would break `h-dvh` children. */}
        <div id="main" className="pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </div>
        <BottomNav isSignedIn={Boolean(session)} />
      </body>
    </html>
  );
}
