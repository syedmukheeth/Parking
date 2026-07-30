import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import type { BookingStatus } from '@parkap/shared';
import { ApiError } from '@/lib/api';
import { requireSession } from '@/lib/session';
import { EmptyState } from '@/components/state/empty-state';
import { ErrorState } from '@/components/state/error-state';
import { LoadingSkeleton } from '@/components/state/loading-skeleton';
import { t } from '@/i18n/messages';
import { listMyBookings } from '@/features/bookings/api';
import { BookingRow } from '@/features/bookings/components/booking-row';

export const metadata: Metadata = { title: t('history.title') };

interface BookingsPageProps {
  searchParams: Promise<{ upcoming?: string; status?: string }>;
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  await requireSession();
  const params = await searchParams;
  const upcoming = params.upcoming !== 'false';

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('history.title')}</h1>
      <nav className="flex gap-4 border-b border-[var(--color-border)] text-sm">
        <Link
          href="/bookings?upcoming=true"
          className={`-mb-px border-b-2 px-1 py-2 ${upcoming ? 'border-[var(--color-brand)] font-medium' : 'border-transparent text-[var(--color-muted)]'}`}
        >
          {t('history.upcoming')}
        </Link>
        <Link
          href="/bookings?upcoming=false"
          className={`-mb-px border-b-2 px-1 py-2 ${!upcoming ? 'border-[var(--color-brand)] font-medium' : 'border-transparent text-[var(--color-muted)]'}`}
        >
          {t('history.past')}
        </Link>
      </nav>
      <Suspense fallback={<LoadingSkeleton rows={4} />}>
        <BookingsList upcoming={upcoming} status={params.status as BookingStatus | undefined} />
      </Suspense>
    </main>
  );
}

async function BookingsList({ upcoming, status }: { upcoming: boolean; status?: BookingStatus }) {
  try {
    const result = await listMyBookings({ upcoming, status, limit: 50 });

    if (result.items.length === 0) {
      return <EmptyState title={t('history.empty.title')} description={t('history.empty.description')} />;
    }

    return (
      <ul className="flex flex-col gap-3">
        {result.items.map((booking) => (
          <BookingRow key={booking.id} booking={booking} />
        ))}
      </ul>
    );
  } catch (error) {
    const message = error instanceof ApiError ? error.message : t('common.error');
    return <ErrorState title={t('common.error')} message={message} />;
  }
}
