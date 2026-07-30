'use client';

import { useActionState } from 'react';
import { t } from '@/i18n/messages';
import { requestOtpAction, verifyOtpAction, type RequestOtpState, type VerifyOtpState } from '../actions';

const initialRequestState: RequestOtpState = { status: 'idle' };
const initialVerifyState: VerifyOtpState = { status: 'idle' };

export function SignInForm() {
  const [requestState, requestFormAction, requestPending] = useActionState(
    requestOtpAction,
    initialRequestState,
  );
  const [verifyState, verifyFormAction, verifyPending] = useActionState(verifyOtpAction, initialVerifyState);

  if (requestState.status !== 'sent') {
    return (
      <form action={requestFormAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium">
            {t('auth.phoneLabel')}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder={t('auth.phonePlaceholder')}
            className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 focus:outline focus:outline-2 focus:outline-[var(--color-brand)]"
            aria-describedby={requestState.status === 'error' ? 'phone-error' : undefined}
            aria-invalid={requestState.status === 'error'}
          />
        </div>
        {requestState.status === 'error' ? (
          <p id="phone-error" role="alert" className="text-sm text-[var(--color-danger)]">
            {requestState.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={requestPending}
          className="rounded-md bg-[var(--color-brand)] px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {requestPending ? t('common.loading') : t('auth.sendCode')}
        </button>
      </form>
    );
  }

  return (
    <form action={verifyFormAction} className="flex flex-col gap-4">
      <input type="hidden" name="requestId" value={requestState.requestId ?? ''} />
      <p className="text-sm text-[var(--color-muted)]" role="status">
        {t('auth.codeSentTo')}
      </p>
      <div>
        <label htmlFor="code" className="block text-sm font-medium">
          {t('auth.codeLabel')}
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoComplete="one-time-code"
          className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 tracking-[0.4em] focus:outline focus:outline-2 focus:outline-[var(--color-brand)]"
          aria-describedby={verifyState.status === 'error' ? 'code-error' : undefined}
          aria-invalid={verifyState.status === 'error'}
        />
      </div>
      {verifyState.status === 'error' ? (
        <p id="code-error" role="alert" className="text-sm text-[var(--color-danger)]">
          {verifyState.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={verifyPending}
        className="rounded-md bg-[var(--color-brand)] px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {verifyPending ? t('common.loading') : t('auth.verify')}
      </button>
    </form>
  );
}
