import Link from 'next/link';
import type { SessionPayload } from '@parkap/shared';
import { t } from '@/i18n/messages';
import { signOutAction } from '@/features/auth/actions';

export function NavHeader({ session }: { session: SessionPayload | null }) {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-[var(--color-brand)]">
          {t('app.name')}
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/search" className="hover:underline">
            {t('nav.search')}
          </Link>
          {session ? (
            <>
              <Link href="/bookings" className="hover:underline">
                {t('nav.bookings')}
              </Link>
              <Link href="/profile" className="hover:underline">
                {t('nav.profile')}
              </Link>
              <form action={signOutAction}>
                <button type="submit" className="text-[var(--color-muted)] hover:underline">
                  {t('nav.signOut')}
                </button>
              </form>
            </>
          ) : (
            <Link href="/sign-in" className="font-medium text-[var(--color-brand)] hover:underline">
              {t('nav.signIn')}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
