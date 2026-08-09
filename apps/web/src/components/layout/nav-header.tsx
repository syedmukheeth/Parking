'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SessionPayload } from '@parkap/shared';
import { t } from '@/i18n/messages';
import { signOutAction } from '@/features/auth/actions';
import { isNavItemActive, NAV_ITEMS } from './nav-items';

/**
 * Desktop navigation. Hidden below `md`, where BottomNav takes over, the two
 * are mutually exclusive so a screen reader never hears the same links twice.
 *
 * Deliberately not width-capped: the map pages are full-bleed, and a header
 * that stops at `max-w-4xl` over a full-width map reads as a broken overlay.
 */
export function NavHeader({ session, demoMode }: { session: SessionPayload | null; demoMode: boolean }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.authOnly || session);

  return (
    <header className="sticky top-0 z-[40] hidden border-b border-border bg-background/85 backdrop-blur-lg md:block">
      <nav aria-label={t('nav.primary')} className="flex items-center gap-6 px-6 py-3">
        <Link href="/" className="text-h3 font-semibold tracking-tight text-primary">
          {t('app.name')}
        </Link>

        <ul className="flex items-center gap-1 text-small">
          {items.map((item) => {
            const active = isNavItemActive(item, pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-sm px-3 py-1.5 transition-colors ${
                    active
                      ? 'bg-primary-subtle font-medium text-primary-subtle-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-3 text-small">
          {/* Sign-out is hidden in demo mode: clearing the cookie would change
           * nothing, because the demo session is minted server-side on every
           * request. Offering a control that cannot take effect is worse than
           * not offering it. */}
          {session && demoMode ? (
            <span className="rounded-full bg-secondary px-3 py-1 text-caption text-muted-foreground">
              {t('nav.demoMode')}
            </span>
          ) : session ? (
            <form action={signOutAction}>
              <button type="submit" className="rounded-sm px-3 py-1.5 text-muted-foreground hover:text-foreground">
                {t('nav.signOut')}
              </button>
            </form>
          ) : (
            <Link href="/sign-in" className="rounded-sm bg-primary px-4 py-2 font-medium text-primary-foreground">
              {t('nav.signIn')}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
