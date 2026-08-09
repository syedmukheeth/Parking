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
        <p role="alert" className="text-small text-destructive">
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
        className="rounded-sm bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60"
      >
        {isPending ? t('common.loading') : t('booking.payWithMock')}
      </button>
    </div>
  );
}
