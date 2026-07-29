import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { formatINR, formatLocalTime } from '@/lib/format';
import { requireSession } from '@/lib/session';
import { t, type MessageKey } from '@/i18n/messages';
import { getBookingDetail } from '@/features/bookings/api';
import { CancelButton } from '@/features/bookings/components/cancel-button';
import { Countdown } from '@/features/bookings/components/countdown';
import { ExtendForm } from '@/features/bookings/components/extend-form';
import { PayNowButton } from '@/features/bookings/components/pay-now-button';
import { TicketQr } from '@/features/tickets/components/ticket-qr';

export const metadata: Metadata = { title: 'Your booking' };

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

  const statusLabel = t(`ticket.status.${booking.status}` as MessageKey);

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t('ticket.title')}</h1>
        <span className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-sm font-medium">{statusLabel}</span>
      </div>

      <div className="flex flex-col gap-1 rounded-lg border border-[var(--color-border)] p-4 text-sm">
        <p>
          <span className="text-[var(--color-muted)]">Vehicle:</span> {booking.vehicleNumber} ({booking.vehicleType})
        </p>
        <p>
          <span className="text-[var(--color-muted)]">From:</span> {formatLocalTime(booking.startAt)}
        </p>
        <p>
          <span className="text-[var(--color-muted)]">Until:</span> {formatLocalTime(booking.endAt)}
        </p>
        <p>
          <span className="text-[var(--color-muted)]">{t('booking.total')}:</span>{' '}
          {formatINR(booking.finalAmount ?? booking.quotedAmount)}
        </p>
      </div>

      {booking.status === 'PENDING' && booking.payment && booking.payment.status === 'CREATED' ? (
        <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] p-4">
          {booking.holdExpiresAt ? (
            <Countdown targetIso={String(booking.holdExpiresAt)} label="Hold expires in" />
          ) : null}
          <PayNowButton paymentId={booking.payment.id} />
        </div>
      ) : null}

      {(booking.status === 'CONFIRMED' || booking.status === 'ACTIVE') && (
        <div className="flex flex-col gap-4 rounded-lg border border-[var(--color-border)] p-4">
          <TicketQr bookingId={booking.id} />
          <Countdown targetIso={String(booking.endAt)} label="Time remaining" />
          <ExtendForm bookingId={booking.id} currentEndAt={String(booking.endAt)} />
          {booking.status === 'CONFIRMED' ? <CancelButton bookingId={booking.id} /> : null}
        </div>
      )}

      {booking.status === 'COMPLETED' ? (
        <p className="text-sm text-[var(--color-muted)]">This booking is complete. Thanks for parking with ParkAP.</p>
      ) : null}
      {booking.status === 'CANCELLED' ? (
        <p className="text-sm text-[var(--color-muted)]">This booking was cancelled{booking.cancelReason ? `: ${booking.cancelReason}` : '.'}</p>
      ) : null}
      {booking.status === 'EXPIRED' ? (
        <p className="text-sm text-[var(--color-muted)]">This reservation expired before payment completed.</p>
      ) : null}
    </main>
  );
}
