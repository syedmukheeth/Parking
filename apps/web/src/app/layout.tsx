import type { Metadata, Viewport } from 'next';
import { t } from '@/i18n/messages';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${t('app.name')} — ${t('app.tagline')}`,
    template: `%s · ${t('app.name')}`,
  },
  description: t('app.tagline'),
};

export const viewport: Viewport = {
  themeColor: '#0f766e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
