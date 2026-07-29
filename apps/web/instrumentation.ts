/**
 * Next.js server-startup hook. Server-side Sentry only — no-ops when
 * SENTRY_DSN is unset (.env.example). Client/edge Sentry wiring is a
 * follow-up if the team wants full session-replay-style client monitoring;
 * this covers server errors and API-route/Server-Action traces, which is
 * where this app's business logic actually runs.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !process.env.SENTRY_DSN) return;

  const Sentry = await import('@sentry/node');
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV, tracesSampleRate: 0.1 });
}
