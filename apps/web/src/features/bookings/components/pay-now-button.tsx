'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { t } from '@/i18n/messages';
import { confirmMockPayment } from '@/features/booking/actions';

export function PayNowButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await confirmMockPayment(paymentId);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          })
        }
        className="rounded-md bg-[var(--color-brand)] px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {isPending ? t('common.loading') : t('booking.payWithMock')}
      </button>
    </div>
  );
}
