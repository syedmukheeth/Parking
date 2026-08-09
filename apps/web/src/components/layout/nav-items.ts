import { Bookmark, Compass, Home, Ticket, User } from 'lucide-react';
import type { MessageKey } from '@/i18n/messages';

/**
 * One navigation definition, rendered as a desktop header and a mobile bottom
 * bar. Two hand-maintained lists is how the two surfaces drift apart.
 *
 * `authOnly` entries are hidden from signed-out visitors rather than shown and
 * bounced to sign-in, a nav item that always redirects is a dead end.
 */
export interface NavItem {
  href: string;
  labelKey: MessageKey;
  icon: typeof Home;
  authOnly: boolean;
  /** Match nested routes too (`/bookings/abc` still lights up "Bookings"). */
  matchPrefix: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', labelKey: 'nav.home', icon: Home, authOnly: false, matchPrefix: false },
  { href: '/search', labelKey: 'nav.explore', icon: Compass, authOnly: false, matchPrefix: true },
  { href: '/bookings', labelKey: 'nav.bookings', icon: Ticket, authOnly: true, matchPrefix: true },
  { href: '/saved', labelKey: 'nav.saved', icon: Bookmark, authOnly: true, matchPrefix: true },
  { href: '/profile', labelKey: 'nav.profile', icon: User, authOnly: true, matchPrefix: true },
] as const;

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.matchPrefix ? pathname === item.href || pathname.startsWith(`${item.href}/`) : pathname === item.href;
}
