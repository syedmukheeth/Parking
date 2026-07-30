'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { t } from '@/i18n/messages';
import { formatLocalTime } from '@/lib/format';
import { getTicketQr } from '../actions';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 10;

/**
 * The ticket is issued asynchronously by apps/worker after payment confirms
 * (docs/ARCHITECTURE.md §2), so there's a brief window right after payment
 * where it doesn't exist yet. This polls a few times rather than treating
 * that as an error.
 */
export function TicketQr({ bookingId }: { bookingId: string }) {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'ready'; qrDataUrl: string; expiresAt: string }
    | { status: 'error'; message: string }
  >({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const poll = async (): Promise<void> => {
      const result = await getTicketQr(bookingId);
      if (cancelled) return;

      if (result.ok) {
        setState({ status: 'ready', qrDataUrl: result.data.qrDataUrl, expiresAt: String(result.data.expiresAt) });
        return;
      }

      attempts += 1;
      if (attempts >= MAX_POLL_ATTEMPTS) {
        setState({ status: 'error', message: result.error });
        return;
      }
      setTimeout(() => void poll(), POLL_INTERVAL_MS);
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (state.status === 'loading') {
    return (
      <div role="status" className="flex flex-col items-center gap-2 py-6">
        <div className="h-48 w-48 animate-pulse rounded-md bg-[var(--color-surface)] motion-reduce:animate-none" />
        <p className="text-sm text-[var(--color-muted)]">Preparing your ticket…</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div role="alert" className="flex flex-col items-center gap-2 py-6 text-center">
        <p className="text-sm text-[var(--color-danger)]">{state.message}</p>
        <p className="text-xs text-[var(--color-muted)]">Refresh this page in a moment to try again.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <p className="text-sm font-medium">{t('ticket.showAtGate')}</p>
      <Image src={state.qrDataUrl} alt="Booking QR code" width={220} height={220} unoptimized />
      <p className="text-xs text-[var(--color-muted)]">
        {t('ticket.expiresAt')} {formatLocalTime(state.expiresAt)}
      </p>
    </div>
  );
}
