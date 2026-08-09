import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

/**
 * Generates the Prisma client after install, for the developer who just
 * cloned the repo, but only when the Prisma CLI is actually present.
 *
 * `prisma` is a devDependency of apps/api. An install that omits dev
 * dependencies (any `NODE_ENV=production` install, which is what Vercel does
 * when building apps/web) leaves no CLI to call, and an unconditional
 * `prisma generate` there fails the whole install with `command not found`
 *, for a web build that never touches the database.
 *
 * Skipping is safe because nothing that needs the client relies on this hook:
 * both Dockerfiles and the Render build command run `prisma generate`
 * explicitly as a build step.
 */
const require = createRequire(import.meta.url);

let cliPath;
try {
  cliPath = require.resolve('prisma/package.json');
} catch {
  console.log('[postinstall] Prisma CLI not installed (dev dependencies omitted), skipping generate.');
  process.exit(0);
}

const result = spawnSync(
  process.execPath,
  [require.resolve('prisma/build/index.js'), 'generate', '--schema', 'apps/api/prisma/schema.prisma'],
  { stdio: 'inherit' },
);

if (result.status !== 0) {
  console.error(`[postinstall] prisma generate failed (CLI at ${cliPath}).`);
  process.exit(result.status ?? 1);
}
