'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { useState, useTransition } from 'react';
import type { CreateBookingResponse, LocationDetail, QuoteResponse, Vehicle } from '@parkap/shared';
import { formatINR } from '@/lib/format';
import { t, type MessageKey } from '@/i18n/messages';
import { confirmMockPayment, createBooking, getQuote } from '../actions';

type Step = 'form' | 'quoted' | 'reserved' | 'paid';

const STEPS: { id: Step; labelKey: MessageKey }[] = [
  { id: 'form', labelKey: 'booking.step.details' },
  { id: 'quoted', labelKey: 'booking.step.review' },
  { id: 'reserved', labelKey: 'booking.step.pay' },
  { id: 'paid', labelKey: 'booking.step.done' },
];

/** Sentinel for the "type a plate this once" option in the vehicle picker. A
 * saved vehicle's id can never collide with it, ids are cuids. */
const OTHER_VEHICLE = '__other__';

/**
 * A client-managed wizard rather than per-step <form action> bindings, each
 * step's typed result (quote, then booking+payment) feeds the next step, and
 * FormData round-tripping would lose that shape. Mutations still only ever
 * go through the Server Actions in ../actions.ts, never a bare fetch
 * (parkap-frontend skill).
 */
export function BookingFlow({
  location,
  vehicles,
  initialVehicleNumber,
}: {
  location: LocationDetail;
  /** The citizen's saved vehicles (docs/ROADMAP.md Phase 12). Empty for an
   * account that hasn't saved one, the free-text field is then the only path. */
  vehicles: Vehicle[];
  /** Repeat-booking pre-fill, carried as a query param from the booking
   * history page's "Book again" link (docs/ROADMAP.md Phase 12). */
  initialVehicleNumber?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState<string | null>(null);

  const [slotTypeId, setSlotTypeId] = useState(location.slotTypes[0]?.id ?? '');

  // A repeat-booking plate wins over the saved default, the citizen asked for
  // that specific past booking. It still selects the matching saved vehicle
  // when there is one, so the picker doesn't look empty.
  const initialSelection =
    vehicles.find((vehicle) => vehicle.vehicleNumber === initialVehicleNumber) ??
    (initialVehicleNumber ? undefined : vehicles.find((vehicle) => vehicle.isDefault) ?? vehicles[0]);

  const [selectedVehicleId, setSelectedVehicleId] = useState(initialSelection?.id ?? OTHER_VEHICLE);
  const [vehicleNumber, setVehicleNumber] = useState(
    initialSelection?.vehicleNumber ?? initialVehicleNumber ?? '',
  );
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [booking, setBooking] = useState<CreateBookingResponse | null>(null);

  const selectedSlotType = location.slotTypes.find((s) => s.id === slotTypeId);

  if (location.slotTypes.length === 0) {
    return <p className="text-small text-muted-foreground">{t('booking.noSlotTypes')}</p>;
  }

  const windowValid = Boolean(startAt && endAt && new Date(endAt) > new Date(startAt));

  function handleGetQuote(): void {
    setError(null);
    if (!selectedSlotType || !vehicleNumber || !windowValid) {
      setError(t('booking.fillEveryField'));
      return;
    }
    startTransition(async () => {
      const result = await getQuote({
        locationId: location.id,
        slotTypeId: selectedSlotType.id,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        vehicleType: selectedSlotType.vehicleType,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setQuote(result.data);
      setStep('quoted');
    });
  }

  function handleReserve(): void {
    if (!selectedSlotType) return;
    setError(null);
    startTransition(async () => {
      const result = await createBooking({
        locationId: location.id,
        slotTypeId: selectedSlotType.id,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        vehicleNumber,
        vehicleType: selectedSlotType.vehicleType,
      });
      if (!result.ok) {
        // SLOT_UNAVAILABLE is a normal outcome here, not an error state, the
        // advisory count shown a moment earlier can race a real reservation
        // (docs/API-CONTRACT.md). Send the citizen back to re-quote.
        if (result.code === 'SLOT_UNAVAILABLE') {
          setError(t('booking.slotUnavailable'));
          setStep('form');
          setQuote(null);
          return;
        }
        setError(result.error);
        return;
      }
      setBooking(result.data);
      setStep('reserved');
    });
  }

  function handlePay(): void {
    if (!booking) return;
    setError(null);
    startTransition(async () => {
      const result = await confirmMockPayment(booking.payment.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStep('paid');
    });
  }

  const currentIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
      <h2 className="text-h2">{t('location.bookNow')}</h2>

      <Stepper currentIndex={currentIndex} />

      {error ? (
        <p role="alert" className="rounded-sm bg-destructive-subtle px-3 py-2 text-small text-destructive-subtle-foreground">
          {error}
        </p>
      ) : null}

      {/* `mode="wait"` so the outgoing step finishes before the next arrives:
       * crossfading two different-height panels makes the card jump. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
        >
          {step === 'form' ? (
            <div className="flex flex-col gap-3">
              <Field label={t('booking.slotType')} htmlFor="slotType">
                <select
                  id="slotType"
                  value={slotTypeId}
                  onChange={(e) => setSlotTypeId(e.target.value)}
                  className={inputClass}
                >
                  {location.slotTypes.map((slot) => (
                    <option key={slot.id} value={slot.id} disabled={slot.available === 0}>
                      {t(`vehicle.${slot.vehicleType}` as MessageKey)} ·{' '}
                      {t(`slotClass.${slot.slotClass}` as MessageKey)} ·{' '}
                      {slot.available === 0 ? t('availability.full') : `${slot.available} ${t('availability.free')}`}
                    </option>
                  ))}
                </select>
              </Field>

              {vehicles.length > 0 ? (
                <Field label={t('booking.savedVehicle')} htmlFor="savedVehicle">
                  <select
                    id="savedVehicle"
                    value={selectedVehicleId}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedVehicleId(value);
                      const picked = vehicles.find((vehicle) => vehicle.id === value);
                      // Clear the field when switching to "another vehicle" so
                      // the citizen doesn't submit the previous plate by accident.
                      setVehicleNumber(picked?.vehicleNumber ?? '');
                    }}
                    className={inputClass}
                  >
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicleNumber}
                        {vehicle.label ? ` · ${vehicle.label}` : ''}
                      </option>
                    ))}
                    <option value={OTHER_VEHICLE}>{t('booking.otherVehicle')}</option>
                  </select>
                </Field>
              ) : null}

              {selectedVehicleId === OTHER_VEHICLE ? (
                <Field label={t('booking.vehicleNumber')} htmlFor="vehicleNumber">
                  <input
                    id="vehicleNumber"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder={t('booking.vehicleNumberPlaceholder')}
                    className={`${inputClass} uppercase`}
                  />
                </Field>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t('booking.startTime')} htmlFor="startAt">
                  <input
                    id="startAt"
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label={t('booking.endTime')} htmlFor="endAt">
                  <input
                    id="endAt"
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>

              <button type="button" onClick={handleGetQuote} disabled={isPending} className={primaryButtonClass}>
                {isPending ? t('common.loading') : t('booking.getQuote')}
              </button>
            </div>
          ) : null}

          {step === 'quoted' && quote ? (
            <div className="flex flex-col gap-3">
              <ul className="flex flex-col gap-1.5 text-small">
                {quote.breakdown.map((line, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="text-muted-foreground">{line.label}</span>
                    <span className="tabular">{formatINR(line.amount)}</span>
                  </li>
                ))}
              </ul>
              <p className="flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-small text-muted-foreground">{t('booking.total')}</span>
                <span className="tabular text-data">{formatINR(quote.amount)}</span>
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep('form')} className={secondaryButtonClass}>
                  {t('common.back')}
                </button>
                <button
                  type="button"
                  onClick={handleReserve}
                  disabled={isPending || quote.available === 0}
                  className={`flex-1 ${primaryButtonClass}`}
                >
                  {isPending ? t('common.loading') : t('booking.confirmReservation')}
                </button>
              </div>
            </div>
          ) : null}

          {step === 'reserved' && booking ? (
            <div className="flex flex-col gap-3">
              <p className="flex items-baseline justify-between">
                <span className="text-small text-muted-foreground">{t('booking.total')}</span>
                <span className="tabular text-data">{formatINR(booking.booking.quotedAmount)}</span>
              </p>
              <p className="text-caption text-muted-foreground">{t('booking.holdNotice')}</p>
              <button type="button" onClick={handlePay} disabled={isPending} className={primaryButtonClass}>
                {isPending ? t('common.loading') : t('booking.payWithMock')}
              </button>
            </div>
          ) : null}

          {step === 'paid' && booking ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                className="flex size-12 items-center justify-center rounded-full bg-available text-available-foreground"
              >
                <Check aria-hidden="true" size={26} strokeWidth={2.6} />
              </motion.span>
              <p role="status" className="text-small font-medium">
                {t('booking.paymentSuccess')}
              </p>
              <Link href={`/bookings/${booking.booking.id}`} className={`w-full ${primaryButtonClass}`}>
                {t('booking.viewTicket')}
              </Link>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const inputClass =
  'mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-body';
const primaryButtonClass =
  'rounded-sm bg-primary px-4 py-2.5 text-center font-medium text-primary-foreground transition-opacity disabled:opacity-60';
const secondaryButtonClass = 'rounded-sm border border-border px-4 py-2.5 text-small';

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-small font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Progress, not navigation, the steps aren't clickable because you can't
 * jump to payment without a quote. It exists to tell the citizen how much is
 * left, which is what stops mid-flow abandonment. */
function Stepper({ currentIndex }: { currentIndex: number }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label={t('booking.progress')}>
      {STEPS.map((s, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        return (
          <li key={s.id} className="flex flex-1 flex-col gap-1.5">
            <span
              aria-hidden="true"
              className={`h-1 rounded-full transition-colors duration-[var(--duration-base)] ${
                done || current ? 'bg-primary' : 'bg-secondary'
              }`}
            />
            <span
              className={`text-caption ${current ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
              aria-current={current ? 'step' : undefined}
            >
              {t(s.labelKey)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
