import Link from 'next/link';
import { ArrowRight, Ticket } from 'lucide-react';
import type { Booking, LocationSummary, User } from '@parkap/shared';
import { EmptyState } from '@/components/state/empty-state';
import { formatDuration, formatINR, formatLocalTime } from '@/lib/format';
import { t, type MessageKey } from '@/i18n/messages';
import { LocationCard } from '@/features/search/components/location-card';
import { activeOrNextBooking, usageStats } from '../stats';
import { HomeSearch } from './home-search';

/** IST, because a greeting keyed off the server's clock greets an AP citizen
 * "good evening" at lunchtime when the box happens to run UTC. */
function greetingKey(now: Date): MessageKey {
  const istHour = Number(
    new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(now),
  );
  if (istHour < 12) return 'home.morning';
  if (istHour < 17) return 'home.afternoon';
  return 'home.evening';
}

export function Dashboard({
  user,
  bookings,
  saved,
}: {
  user: User;
  bookings: Booking[];
  saved: LocationSummary[];
}) {
  const stats = usageStats(bookings);
  const current = activeOrNextBooking(bookings);
  const firstName = user.name?.split(' ')[0];

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-6 sm:px-6 lg:py-10">
      <header className="flex flex-col gap-4">
        <div>
          <p className="text-small text-muted-foreground">
            {t(greetingKey(new Date()))}
            {firstName ? `, ${firstName}` : ''}
          </p>
          <h1 className="text-h1">{t('home.whereParking')}</h1>
        </div>
        <HomeSearch />
      </header>

      {current ? (
        <section aria-labelledby="active-heading">
          <h2 id="active-heading" className="mb-3 text-h2">
            {current.status === 'ACTIVE' ? t('home.activeSession') : t('home.upcoming')}
          </h2>
          <Link
            href={`/bookings/${current.id}`}
            className="flex items-center gap-4 rounded-lg border border-primary bg-primary-subtle p-4 transition-shadow hover:shadow-[var(--shadow-md)]"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Ticket aria-hidden="true" size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="tabular block text-h3">{current.vehicleNumber}</span>
              <span className="tabular block text-small text-muted-foreground">
                {formatLocalTime(current.startAt)} → {formatLocalTime(current.endAt)}
              </span>
            </span>
            <ArrowRight aria-hidden="true" size={18} className="shrink-0 text-primary" />
          </Link>
        </section>
      ) : null}

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="mb-3 text-h2">
          {t('home.yourParking')}
        </h2>
        <dl className="grid grid-cols-3 gap-3">
          <Stat label={t('home.sessions')} value={String(stats.sessions)} />
          <Stat label={t('home.spent')} value={formatINR(stats.totalPaise)} />
          <Stat label={t('home.timeParked')} value={formatDuration(stats.totalMinutes)} />
        </dl>
      </section>

      <section aria-labelledby="saved-heading">
        <h2 id="saved-heading" className="mb-3 text-h2">
          {t('favourites.title')}
        </h2>
        {saved.length === 0 ? (
          <EmptyState
            title={t('favourites.empty.title')}
            description={t('favourites.empty.description')}
            actionHref="/search"
            actionLabel={t('favourites.empty.cta')}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {saved.slice(0, 3).map((location) => (
              <LocationCard key={location.id} location={location} isFavourite showFavourite />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <dd className="tabular text-data">{value}</dd>
      <dt className="text-caption text-muted-foreground">{label}</dt>
    </div>
  );
}
