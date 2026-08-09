'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { formatINR } from '@/lib/format';
import { t, tf } from '@/i18n/messages';
import { extendBooking } from '@/features/booking/actions';

export function ExtendForm({ bookingId, currentEndAt }: { bookingId: string; currentEndAt: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newEndAt, setNewEndAt] = useState('');
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  function handleSubmit(): void {
    if (!newEndAt) return;
    setMessage(null);
    startTransition(async () => {
      const result = await extendBooking(bookingId, new Date(newEndAt).toISOString());
      if (!result.ok) {
        // SLOT_UNAVAILABLE is a normal outcome for an extension, not an error
        // state (docs/API-CONTRACT.md), worded accordingly either way.
        setMessage({ kind: 'error', text: result.error });
        return;
      }
      setMessage({
        kind: 'success',
        text: tf('ticket.extended', { amount: formatINR(result.data.payment.amount) }),
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <label htmlFor="newEndAt" className="text-small font-medium">
        {t('ticket.newEndTime')}
      </label>
      <div className="flex gap-2">
        <input
          id="newEndAt"
          type="datetime-local"
          value={newEndAt}
          min={currentEndAt.slice(0, 16)}
          onChange={(e) => setNewEndAt(e.target.value)}
          className="flex-1 rounded-sm border border-input bg-background px-3 py-2"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !newEndAt}
          className="rounded-sm border border-primary px-4 py-2 text-small font-medium text-primary disabled:opacity-60"
        >
          {isPending ? t('common.loading') : t('ticket.extend')}
        </button>
      </div>
      {message ? (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`text-small ${message.kind === 'error' ? 'text-destructive' : 'text-success'}`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
