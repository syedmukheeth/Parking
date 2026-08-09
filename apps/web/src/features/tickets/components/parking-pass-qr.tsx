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
        setState({
          status: 'ready',
          qrDataUrl: result.data.qrDataUrl,
          expiresAt: String(result.data.expiresAt),
        });
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
      <div role="status" className="flex flex-col items-center gap-3 px-5 py-6">
        <div className="size-52 animate-pulse rounded-sm bg-secondary motion-reduce:animate-none" />
        <p className="text-small text-muted-foreground">{t('ticket.preparing')}</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div role="alert" className="flex flex-col items-center gap-1 px-5 py-6 text-center">
        <p className="text-small text-destructive">{state.message}</p>
        <p className="text-caption text-muted-foreground">{t('ticket.retryHint')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 px-5 py-6">
      {/* White plate behind the QR regardless of theme, scanners need the
       * quiet zone and the contrast, and a dark-mode QR often will not read. */}
      <div className="rounded-sm bg-white p-3">
        <Image src={state.qrDataUrl} alt={t('ticket.qrAlt')} width={208} height={208} unoptimized />
      </div>
      <p className="text-small font-medium">{t('ticket.showAtGate')}</p>
      <p className="tabular text-caption text-muted-foreground">
        {t('ticket.expiresAt')} {formatLocalTime(state.expiresAt)}
      </p>
    </div>
  );
}
