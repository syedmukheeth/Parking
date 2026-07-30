import type { Metadata, Viewport } from 'next';
import { NavHeader } from '@/components/layout/nav-header';
import { t } from '@/i18n/messages';
import { getSession } from '@/lib/session';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${t('app.name')} — ${t('app.tagline')}`,
    template: `%s · ${t('app.name')}`,
  },
  description: t('app.tagline'),
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#0f766e',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <NavHeader session={session} />
        {children}
      </body>
    </html>
  );
}
