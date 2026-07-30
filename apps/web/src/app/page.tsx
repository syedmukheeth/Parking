import Link from 'next/link';
import { t } from '@/i18n/messages';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-57px)] max-w-2xl flex-col justify-center gap-6 px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('app.name')}</h1>
        <p className="text-[var(--color-muted)]">{t('home.tagline')}</p>
      </div>
      <form action="/search" className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          {t('home.searchPlaceholder')}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          placeholder={t('home.searchPlaceholder')}
          className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-4 py-3 focus:outline focus:outline-2 focus:outline-[var(--color-brand)]"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-[var(--color-brand)] px-5 py-3 font-medium text-white"
        >
          {t('home.searchCta')}
        </button>
      </form>
      <p className="text-sm text-[var(--color-muted)]">
        <Link href="/search" className="underline underline-offset-2">
          {t('nav.search')}
        </Link>{' '}
        without typing anything to see all nearby lots.
      </p>
    </main>
  );
}
