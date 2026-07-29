import 'server-only';
import { z } from 'zod';

/**
 * Server-only secrets — never bundled to the client. `server-only` makes
 * importing this from a Client Component a build error, not just a review
 * nit (parkap-frontend skill).
 */
const serverEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function loadServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse({
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid server environment for @parkap/web:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}
