import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { formatINR } from '@/lib/format';
import { requireSession } from '@/lib/session';
import { t } from '@/i18n/messages';
import { getBookingDetail } from '@/features/bookings/api';
import { CancelButton } from '@/features/bookings/components/cancel-button';
import { Countdown } from '@/features/bookings/components/countdown';
import { ExtendForm } from '@/features/bookings/components/extend-form';
import { PayNowButton } from '@/features/bookings/components/pay-now-button';
import { ParkingPass } from '@/features/tickets/components/parking-pass';
import { PendingPassRefresher } from '@/features/tickets/components/pending-pass-refresher';

export const metadata: Metadata = { title: t('ticket.title') };

interface BookingPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({ params }: BookingPageProps) {
  await requireSession();
  const { id } = await params;

  let booking;
  try {
    booking = await getBookingDetail(id);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'NOT_FOUND') notFound();
    throw error;
  }

  const isLive = booking.status === 'CONFIRMED' || booking.status === 'ACTIVE';
  const awaitingPayment =
    booking.status === 'PENDING' && booking.payment && booking.payment.status === 'CREATED';
  // Paid, but the worker has not confirmed it yet. A transient state, seconds
  // long, that the citizen lands in immediately after tapping pay.
  const issuing = booking.status === 'PENDING' && booking.payment?.status === 'SUCCESS';

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-6 sm:px-6 lg:py-10">
      <h1 className="text-h1">{t('ticket.title')}</h1>

      {issuing ? (
        <>
          <PendingPassRefresher />
          <p role="status" className="rounded-lg border border-border bg-secondary px-5 py-3 text-small">
            {t('ticket.issuing')}
          </p>
        </>
      ) : null}

      <ParkingPass booking={booking} />

      <div className="flex items-baseline justify-between rounded-lg border border-border bg-card px-5 py-3">
        <span className="text-small text-muted-foreground">{t('booking.total')}</span>
        <span className="tabular text-data">{formatINR(booking.finalAmount ?? booking.quotedAmount)}</span>
      </div>

      {awaitingPayment && booking.payment ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
          {booking.holdExpiresAt ? (
            <Countdown targetIso={String(booking.holdExpiresAt)} label={t('ticket.holdExpires')} />
          ) : null}
          <PayNowButton paymentId={booking.payment.id} />
        </div>
      ) : null}

      {isLive ? (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
          <Countdown targetIso={String(booking.endAt)} label={t('ticket.timeRemaining')} />
          <ExtendForm bookingId={booking.id} currentEndAt={String(booking.endAt)} />
          {booking.status === 'CONFIRMED' ? <CancelButton bookingId={booking.id} /> : null}
        </div>
      ) : null}

      {/* Terminal states get a plain sentence and a way onward, not a dead end. */}
      {booking.status === 'COMPLETED' || booking.status === 'CANCELLED' || booking.status === 'EXPIRED' ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border p-5">
          <p className="text-small text-muted-foreground">
            {booking.status === 'COMPLETED' ? t('ticket.completedNote') : null}
            {booking.status === 'CANCELLED'
              ? `${t('ticket.cancelledNote')}${booking.cancelReason ? `: ${booking.cancelReason}` : ''}`
              : null}
            {booking.status === 'EXPIRED' ? t('ticket.expiredNote') : null}
          </p>
          <Link
            href={`/locations/${booking.locationId}?vehicleNumber=${encodeURIComponent(booking.vehicleNumber)}`}
            className="rounded-sm bg-primary px-4 py-2 text-small font-medium text-primary-foreground"
          >
            {t('history.repeatBooking')}
          </Link>
        </div>
      ) : null}
    </main>
  );
}
