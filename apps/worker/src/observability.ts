import * as Sentry from '@sentry/node';

/** No-ops when unset (.env.example) - same pattern as apps/api. */
export function initSentry(dsn: string | undefined): void {
  if (!dsn) return;
  Sentry.init({ dsn, environment: process.env.NODE_ENV, tracesSampleRate: 0.1 });
}
