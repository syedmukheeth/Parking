'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/state/error-state';
import { t } from '@/i18n/messages';

/**
 * Root error boundary. Catches anything a route segment throws that its own
 * boundary didn't, so a citizen never lands on Next's default error page.
 *
 * `reset()` re-renders the segment rather than reloading, a transient API
 * failure recovers without losing the rest of the app.
 */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaced to Sentry by the instrumentation hook; the console line is for
    // local development, where a swallowed digest is impossible to debug.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16 sm:px-6">
      <ErrorState title={t('common.error')} message={t('error.generic.description')} onRetry={reset} retryLabel={t('common.retry')} />
    </main>
  );
}
