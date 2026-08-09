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
        className="text-small text-destructive underline underline-offset-2"
      >
        {t('ticket.cancelBooking')}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-small">Are you sure you want to cancel this booking?</p>
      {error ? (
        <p role="alert" className="text-small text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-sm border border-border px-3 py-1.5 text-small"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="rounded-sm bg-destructive px-3 py-1.5 text-small font-medium text-destructive-foreground disabled:opacity-60"
        >
          {isPending ? t('common.loading') : t('common.confirm')}
        </button>
      </div>
    </div>
  );
}
