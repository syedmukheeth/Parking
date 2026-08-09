'use client';

import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { t } from '@/i18n/messages';
import { GeolocateButton } from '@/features/search/components/geolocate-button';

/**
 * The primary action on the home screen.
 *
 * Still a real `<form>` with a GET action, so it works before hydration and
 * without JavaScript — the router push is an enhancement, not the mechanism.
 */
export function HomeSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  return (
    <form
      action="/search"
      onSubmit={(event) => {
        event.preventDefault();
        router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search');
      }}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <div className="relative flex-1">
        <Search
          aria-hidden="true"
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <label htmlFor="home-q" className="sr-only">
          {t('home.searchPlaceholder')}
        </label>
        <input
          id="home-q"
          name="q"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('home.searchPlaceholder')}
          className="w-full rounded-sm border border-input bg-card py-3.5 pl-11 pr-3 text-body shadow-[var(--shadow-xs)]"
        />
      </div>
      <div className="flex gap-2">
        <GeolocateButton />
        <button
          type="submit"
          className="flex-1 rounded-sm bg-primary px-5 py-3.5 font-medium text-primary-foreground sm:flex-none"
        >
          {t('home.searchCta')}
        </button>
      </div>
    </form>
  );
}
