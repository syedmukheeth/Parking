import type { Metadata } from 'next';
import { SignInForm } from '@/features/auth/components/sign-in-form';
import { t } from '@/i18n/messages';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-57px)] max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <div>
        <h1 className="text-h1">{t('auth.title')}</h1>
        <p className="mt-1 text-small text-muted-foreground">{t('auth.subtitle')}</p>
      </div>
      <SignInForm />
    </main>
  );
}
