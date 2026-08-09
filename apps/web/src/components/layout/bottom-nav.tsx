'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@/i18n/messages';
import { isNavItemActive, NAV_ITEMS } from './nav-items';

/**
 * Mobile primary navigation. Desktop uses the header instead, this is
 * `md:hidden`, and the header is `hidden md:flex`, so exactly one is ever
 * present in the accessibility tree.
 *
 * `pb-[env(safe-area-inset-bottom)]` keeps the row clear of the iOS home
 * indicator; without it the last few pixels of every tab are unreachable.
 */
export function BottomNav({ isSignedIn }: { isSignedIn: boolean }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.authOnly || isSignedIn);

  return (
    <nav
      aria-label={t('nav.primary')}
      className="fixed inset-x-0 bottom-0 z-[40] border-t border-border bg-background/90 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch justify-around">
        {items.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                // min-h-14 keeps every target above the 44px touch minimum.
                className={`flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-caption transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon aria-hidden="true" size={20} strokeWidth={active ? 2.4 : 1.8} />
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
