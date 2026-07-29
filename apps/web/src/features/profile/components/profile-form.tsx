'use client';

import { useActionState } from 'react';
import type { User } from '@parkap/shared';
import { t } from '@/i18n/messages';
import { updateProfileAction, type UpdateProfileState } from '../actions';

const initialState: UpdateProfileState = { status: 'idle' };

export function ProfileForm({ user }: { user: User }) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          {t('profile.name')}
        </label>
        <input
          id="name"
          name="name"
          defaultValue={user.name ?? ''}
          className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          {t('profile.email')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={user.email ?? ''}
          className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="locale" className="block text-sm font-medium">
          Language
        </label>
        <select
          id="locale"
          name="locale"
          defaultValue={user.locale}
          className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2"
        >
          <option value="en">English</option>
          <option value="te">తెలుగు (Telugu)</option>
        </select>
      </div>

      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {state.error}
        </p>
      ) : null}
      {state.status === 'success' ? (
        <p role="status" className="text-sm text-[var(--color-success)]">
          {t('profile.saved')}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-[var(--color-brand)] px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {isPending ? t('common.loading') : t('profile.save')}
      </button>
    </form>
  );
}
