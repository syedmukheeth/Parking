import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import type { NextConfig } from 'next';

// One .env at the repo root, shared by api, web, and worker — the same load
// apps/api/src/config/env.ts does. Next only reads .env files from its own
// directory, so without this the web app boots with no BETTER_AUTH_SECRET and
// every session read throws. Values already in the real environment (CI,
// Coolify) win over the file.
loadDotenv({ path: resolve(__dirname, '../../.env') });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `next build` and `next dev` both write here, so building while the dev
  // server is running clobbers its output and the running app silently loses
  // all its CSS. Set NEXT_DIST_DIR to build into a separate directory instead.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // packages/shared ships as compiled JS; transpiling it keeps source maps
  // meaningful and lets the app consume it without a build-order surprise.
  transpilePackages: ['@parkap/shared'],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  // Self-contained server bundle for the Docker runtime stage — copies only
  // the traced dependency subset, not the whole monorepo node_modules
  // (docs/ARCHITECTURE.md §2, parkap-devops skill).
  //
  // Vercel does its own tracing and asks that standalone be left off; setting
  // it there produces a build that emits a server it will never run.
  output: process.env.VERCEL ? undefined : 'standalone',
};

export default nextConfig;
