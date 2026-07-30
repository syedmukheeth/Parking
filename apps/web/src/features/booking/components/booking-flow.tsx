'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import type { CreateBookingResponse, LocationDetail, QuoteResponse } from '@parkap/shared';
import { formatINR } from '@/lib/format';
import { t } from '@/i18n/messages';
import { confirmMockPayment, createBooking, getQuote } from '../actions';

type Step = 'form' | 'quoted' | 'reserved' | 'paid';

/**
 * A client-managed wizard rather than per-step <form action> bindings — each
 * step's typed result (quote, then booking+payment) feeds the next step, and
 * FormData round-tripping would lose that shape. Mutations still only ever
 * go through the Server Actions in ../actions.ts, never a bare fetch
 * (parkap-frontend skill).
 */
export function BookingFlow({
  location,
  initialVehicleNumber,
}: {
  location: LocationDetail;
  /** Repeat-booking pre-fill — carried as a query param from the booking
   * history page's "Book again" link (docs/ROADMAP.md Phase 12). */
  initialVehicleNumber?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState<string | null>(null);

  const [slotTypeId, setSlotTypeId] = useState(location.slotTypes[0]?.id ?? '');
  const [vehicleNumber, setVehicleNumber] = useState(initialVehicleNumber ?? '');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [booking, setBooking] = useState<CreateBookingResponse | null>(null);

  const selectedSlotType = location.slotTypes.find((s) => s.id === slotTypeId);

  if (location.slotTypes.length === 0) {
    return <p className="text-sm text-[var(--color-muted)]">No slot types are configured for this location yet.</p>;
  }

  const windowValid = Boolean(startAt && endAt && new Date(endAt) > new Date(startAt));

  function handleGetQuote(): void {
    setError(null);
    if (!selectedSlotType || !vehicleNumber || !windowValid) {
      setError('Fill in every field — the end time must be after the start time.');
      return;
    }
    startTransition(async () => {
      const result = await getQuote({
        locationId: location.id,
        slotTypeId: selectedSlotType.id,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
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
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        vehicleNumber,
        vehicleType: selectedSlotType.vehicleType,
      });
      if (!result.ok) {
        // SLOT_UNAVAILABLE is a normal outcome here, not an error state — the
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

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[var(--color-border)] p-4">
      <h2 className="text-lg font-semibold">{t('location.bookNow')}</h2>

      {error ? (
        <p role="alert" className="rounded-md bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}

      {step === 'form' ? (
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="slotType" className="block text-sm font-medium">
              Slot type
            </label>
            <select
              id="slotType"
              value={slotTypeId}
              onChange={(e) => setSlotTypeId(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2"
            >
              {location.slotTypes.map((slot) => (
                <option key={slot.id} value={slot.id} disabled={slot.available === 0}>
                  {slot.vehicleType} · {slot.slotClass} — {slot.available} available
                  {slot.available === 0 ? ' (full)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="vehicleNumber" className="block text-sm font-medium">
              {t('booking.vehicleNumber')}
            </label>
            <input
              id="vehicleNumber"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder={t('booking.vehicleNumberPlaceholder')}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 uppercase"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="startAt" className="block text-sm font-medium">
                {t('booking.startTime')}
              </label>
              <input
                id="startAt"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="endAt" className="block text-sm font-medium">
                {t('booking.endTime')}
              </label>
              <input
                id="endAt"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGetQuote}
            disabled={isPending}
            className="rounded-md bg-[var(--color-brand)] px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {isPending ? t('common.loading') : t('booking.getQuote')}
          </button>
        </div>
      ) : null}

      {step === 'quoted' && quote ? (
        <div className="flex flex-col gap-3">
          <ul className="text-sm">
            {quote.breakdown.map((line, i) => (
              <li key={i} className="flex justify-between">
                <span>{line.label}</span>
                <span>{formatINR(line.amount)}</span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between border-t border-[var(--color-border)] pt-2 font-medium">
            <span>{t('booking.total')}</span>
            <span>{formatINR(quote.amount)}</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep('form')}
              className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm"
            >
              {t('common.back')}
            </button>
            <button
              type="button"
              onClick={handleReserve}
              disabled={isPending || quote.available === 0}
              className="flex-1 rounded-md bg-[var(--color-brand)] px-4 py-2 font-medium text-white disabled:opacity-60"
            >
              {isPending ? t('common.loading') : t('booking.confirmReservation')}
            </button>
          </div>
        </div>
      ) : null}

      {step === 'reserved' && booking ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {t('booking.total')}: <strong>{formatINR(booking.booking.quotedAmount)}</strong>
          </p>
          <button
            type="button"
            onClick={handlePay}
            disabled={isPending}
            className="rounded-md bg-[var(--color-brand)] px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {isPending ? t('common.loading') : t('booking.payWithMock')}
          </button>
        </div>
      ) : null}

      {step === 'paid' && booking ? (
        <div className="flex flex-col gap-3">
          <p role="status" className="text-sm text-[var(--color-success)]">
            {t('booking.paymentSuccess')}
          </p>
          <Link
            href={`/bookings/${booking.booking.id}`}
            className="rounded-md bg-[var(--color-brand)] px-4 py-2 text-center font-medium text-white"
          >
            View ticket
          </Link>
        </div>
      ) : null}
    </div>
  );
}
