'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { t } from '@/i18n/messages';
import { cancelBooking } from '@/features/booking/actions';

export function CancelButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function handleCancel(): void {
    setError(null);
    startTransition(async () => {
      const result = await cancelBooking(bookingId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-[var(--color-danger)] underline underline-offset-2"
      >
        {t('ticket.cancelBooking')}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm">Are you sure you want to cancel this booking?</p>
      {error ? (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="rounded-md bg-[var(--color-danger)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? t('common.loading') : t('common.confirm')}
        </button>
      </div>
    </div>
  );
}
