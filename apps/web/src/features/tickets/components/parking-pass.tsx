import type { BookingDetail } from '@parkap/shared';
import { formatLocalTime } from '@/lib/format';
import { t, type MessageKey } from '@/i18n/messages';
import { TicketQr } from './parking-pass-qr';

/** Which statuses get a pass treatment vs a plain record. */
const LIVE_STATUSES = new Set(['CONFIRMED', 'ACTIVE']);

/**
 * The digital parking pass — the thing a citizen holds up at the gate.
 *
 * Shaped like a physical ticket on purpose: a stub with the details, a
 * perforation, and the QR. That structure is why it reads as a pass at a
 * glance in a queue rather than as another card in an app.
 *
 * The reservation id is deliberately prominent and monospaced-by-tabular —
 * it's what a citizen reads aloud to a gate attendant when a scanner fails.
 */
export function ParkingPass({ booking }: { booking: BookingDetail }) {
  const isLive = LIVE_STATUSES.has(booking.status);
  const statusLabel = t(`ticket.status.${booking.status}` as MessageKey);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-md)]">
      <div className="flex items-center justify-between bg-primary px-5 py-3 text-primary-foreground">
        <span className="text-caption font-semibold uppercase tracking-wider">{t('ticket.pass')}</span>
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-caption font-medium">{statusLabel}</span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 text-small">
        <PassField label={t('ticket.vehicle')} value={booking.vehicleNumber} emphasis />
        <PassField
          label={t('ticket.reservation')}
          value={`#${booking.id.slice(-8).toUpperCase()}`}
          emphasis
        />
        <PassField label={t('ticket.from')} value={formatLocalTime(booking.startAt)} />
        <PassField label={t('ticket.until')} value={formatLocalTime(booking.endAt)} />
      </dl>

      {isLive ? (
        <>
          {/* The perforation. Notches on both sides plus a dashed rule is what
           * makes the shape read as a torn ticket rather than a divider. */}
          <div className="relative border-t border-dashed border-border">
            <span className="absolute -left-2 -top-2 size-4 rounded-full bg-background" aria-hidden="true" />
            <span className="absolute -right-2 -top-2 size-4 rounded-full bg-background" aria-hidden="true" />
          </div>
          <TicketQr bookingId={booking.id} />
        </>
      ) : null}
    </div>
  );
}

function PassField({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className={emphasis ? 'tabular text-h3' : 'tabular'}>{value}</dd>
    </div>
  );
}
