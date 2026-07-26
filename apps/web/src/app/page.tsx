import { t } from '@/i18n/messages';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-3 px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t('app.name')}</h1>
      <p className="text-[var(--color-muted)]">{t('app.tagline')}</p>
    </main>
  );
}
