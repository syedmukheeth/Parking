'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 15;

/**
 * Refreshes the pass while the booking is paid but not yet confirmed.
 *
 * The ticket is issued by apps/worker after the payment webhook lands
 * (docs/ARCHITECTURE.md §2), so there is a real gap between a citizen tapping
 * pay and the pass existing. This page is a Server Component, so without this
 * the gap renders "awaiting payment" and stays that way until a manual reload
 *, the booking silently looks unpaid on the screen that exists to prove it is.
 *
 * Bounded rather than indefinite: if the worker is genuinely down, a page that
 * polls forever hides the failure instead of surfacing it.
 */
export function PendingPassRefresher() {
  const router = useRouter();

  useEffect(() => {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (attempts > MAX_ATTEMPTS) {
        clearInterval(timer);
        return;
      }
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [router]);

  return null;
}
