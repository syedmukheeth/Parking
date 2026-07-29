import Link from 'next/link';
import type { Booking } from '@parkap/shared';
import { formatINR, formatLocalTime } from '@/lib/format';
import { t, type MessageKey } from '@/i18n/messages';

export function BookingRow({ booking }: { booking: Booking }) {
  const isRepeatable = ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(booking.status);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{formatLocalTime(booking.startAt)}</p>
        <p className="text-sm text-[var(--color-muted)]">
          {booking.vehicleNumber} · {formatINR(booking.finalAmount ?? booking.quotedAmount)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs font-medium">
          {t(`ticket.status.${booking.status}` as MessageKey)}
        </span>
        <Link href={`/bookings/${booking.id}`} className="text-sm text-[var(--color-brand)] underline underline-offset-2">
          View
        </Link>
        {isRepeatable ? (
          <Link
            href={`/locations/${booking.locationId}?vehicleNumber=${encodeURIComponent(booking.vehicleNumber)}`}
            className="text-sm underline underline-offset-2"
          >
            {t('history.repeatBooking')}
          </Link>
        ) : null}
      </div>
    </li>
  );
}
