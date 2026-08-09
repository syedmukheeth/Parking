import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// One .env at the repo root, shared by api, web, and worker. Values already
// present in the real environment (CI, Coolify) win over the file.
loadDotenv({ path: resolve(__dirname, '../../../../.env') });

const csv = z
  .string()
  .transform((value) => value.split(',').map((v) => v.trim()).filter(Boolean));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  // Upstash Redis, required from day one (holds, OTP challenges, rate limits) —
  // there is no local-only fallback (docs/ARCHITECTURE.md §7, parkap-devops skill).
  REDIS_URL: z.string().url(),

  API_PORT: z.coerce.number().int().positive().default(4000),
  API_CORS_ORIGINS: csv.default('http://localhost:3000'),

  TICKET_TOKEN_SECRET: z.string().min(32, 'TICKET_TOKEN_SECRET must be at least 32 characters'),
  BOOKING_HOLD_TTL_MINUTES: z.coerce.number().int().positive().max(60).default(10),

  // Shared with apps/web. Web signs the session JWT (it owns sessions); the
  // api only verifies it here — never issues one (docs/CLAUDE.md non-negotiable 7).
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),

  OTP_PROVIDER: z.enum(['stub', 'msg91', 'twilio']).default('stub'),
  PAYMENT_PROVIDER: z.enum(['mock', 'razorpay']).default('mock'),

  /**
   * Where post-confirmation work runs.
   *
   * `queue` is the design: the api enqueues, apps/worker consumes, and BullMQ
   * provides retries and a dead-letter queue.
   *
   * `inline` runs it in the api process instead, for deployments with nowhere
   * to host a worker. It is a documented stopgap, not an equal option — there
   * are no retries and no DLQ, so a failure is logged and the ticket is issued
   * later, lazily, when the pass is first requested.
   */
  JOB_RUNNER: z.enum(['queue', 'inline']).default('queue'),

  SENTRY_DSN: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Stub providers must never reach production. The stub OTP provider accepts
 * `123456` for every phone number, so shipping it is a complete authentication
 * bypass — this guard is load-bearing, not a nicety.
 */
function assertNoStubsInProduction(env: Env): void {
  if (env.NODE_ENV !== 'production') return;

  const offenders: string[] = [];
  if (env.OTP_PROVIDER === 'stub') offenders.push('OTP_PROVIDER=stub');
  if (env.PAYMENT_PROVIDER === 'mock') offenders.push('PAYMENT_PROVIDER=mock');

  if (offenders.length > 0) {
    throw new Error(
      `Refusing to boot: stub providers are active under NODE_ENV=production (${offenders.join(
        ', ',
      )}). The stub OTP provider accepts a fixed code for every phone number.`,
    );
  }
}

let cached: Env | undefined;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;

  // Container platforms (Railway, Render, Fly, Cloud Run) assign a port and
  // hand it over as `PORT`, and route external traffic only to that port.
  // Listening on our own 4000 there produces a service that boots cleanly and
  // is never reachable — the worst kind of deploy failure. An explicit
  // API_PORT still wins, so local .env behaviour is unchanged.
  const parsed = envSchema.safeParse({
    ...source,
    API_PORT: source.API_PORT ?? source.PORT,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment for @parkap/api:\n${issues}`);
  }

  assertNoStubsInProduction(parsed.data);
  cached = parsed.data;
  return cached;
}
