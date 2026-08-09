import Link from 'next/link';
import { ArrowRight, CreditCard, MapPin, QrCode, Search } from 'lucide-react';
import type { LocationSummary } from '@parkap/shared';
import { t, type MessageKey } from '@/i18n/messages';
import { LazyMap } from '@/features/map/lazy-map';

const STEPS: { icon: typeof Search; titleKey: MessageKey; bodyKey: MessageKey }[] = [
  { icon: Search, titleKey: 'landing.step1.title', bodyKey: 'landing.step1.body' },
  { icon: MapPin, titleKey: 'landing.step2.title', bodyKey: 'landing.step2.body' },
  { icon: CreditCard, titleKey: 'landing.step3.title', bodyKey: 'landing.step3.body' },
  { icon: QrCode, titleKey: 'landing.step4.title', bodyKey: 'landing.step4.body' },
];

/**
 * The signed-out landing page.
 *
 * The product is the hero: the map section below is the real MapView rendering
 * real seeded lots with live availability, not a screenshot. It is the single
 * most convincing thing on the page precisely because it is the actual app.
 *
 * Every claim here is one the build can support today — no ANPR, no FASTag, no
 * "AI-powered" anything. Those are named as future modules in docs/ROADMAP.md
 * and stay off the marketing surface until they exist.
 */
export function Landing({ locations, cities }: { locations: LocationSummary[]; cities: string[] }) {
  return (
    <main className="flex flex-col">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="mx-auto flex w-full max-w-4xl flex-col items-start gap-6 px-4 py-16 sm:px-6 lg:py-24">
        <h1 className="text-display max-w-3xl text-balance">{t('landing.heroTitle')}</h1>
        <p className="max-w-xl text-body text-muted-foreground">{t('landing.heroBody')}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-sm bg-primary px-6 py-3 font-medium text-primary-foreground"
          >
            {t('landing.heroCta')}
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
          <Link href="/sign-in" className="rounded-sm border border-border px-6 py-3 font-medium">
            {t('nav.signIn')}
          </Link>
        </div>
      </section>

      {/* ── The problem ─────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-16 sm:px-6">
          <p className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
            {t('landing.problem.eyebrow')}
          </p>
          <h2 className="text-h1 max-w-2xl text-balance">{t('landing.problem.title')}</h2>
          <p className="max-w-xl text-body text-muted-foreground">{t('landing.problem.body')}</p>
        </div>
      </section>

      {/* ── Live map ────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-6 flex flex-col gap-2">
          <h2 className="text-h1">{t('landing.live.title')}</h2>
          <p className="max-w-xl text-body text-muted-foreground">{t('landing.live.body')}</p>
        </div>
        <div className="h-[420px] overflow-hidden rounded-xl border border-border shadow-[var(--shadow-lg)]">
          <LazyMap locations={locations} className="h-full w-full" />
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
          <h2 className="mb-8 text-h1">{t('landing.how.title')}</h2>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.titleKey} className="flex flex-col gap-2">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary-subtle text-primary-subtle-foreground">
                    <Icon aria-hidden="true" size={18} />
                  </span>
                  <h3 className="text-h3">
                    <span className="tabular mr-1.5 text-muted-foreground">{index + 1}.</span>
                    {t(step.titleKey)}
                  </h3>
                  <p className="text-small text-muted-foreground">{t(step.bodyKey)}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── Coverage ────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="mb-2 text-h1">{t('landing.cities.title')}</h2>
        <p className="mb-6 max-w-xl text-body text-muted-foreground">{t('landing.cities.body')}</p>
        <ul className="flex flex-wrap gap-2">
          {cities.map((city) => (
            <li key={city}>
              <Link
                href={`/search?q=${encodeURIComponent(city)}`}
                className="inline-block rounded-full border border-border px-4 py-2 text-small transition-colors hover:border-primary hover:text-primary"
              >
                {city}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── For operators ───────────────────────────────────────────────── */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
          <h2 className="mb-2 text-h1">{t('landing.operators.title')}</h2>
          <p className="max-w-xl text-body text-muted-foreground">{t('landing.operators.body')}</p>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto flex w-full max-w-4xl flex-col items-start gap-5 px-4 py-20 sm:px-6">
        <h2 className="text-h1 max-w-2xl text-balance">{t('landing.cta.title')}</h2>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 rounded-sm bg-primary px-6 py-3 font-medium text-primary-foreground"
        >
          {t('landing.heroCta')}
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </section>
    </main>
  );
}
