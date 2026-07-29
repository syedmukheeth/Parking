import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // packages/shared ships as compiled JS; transpiling it keeps source maps
  // meaningful and lets the app consume it without a build-order surprise.
  transpilePackages: ['@parkap/shared'],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  // Self-contained server bundle for the Docker runtime stage — copies only
  // the traced dependency subset, not the whole monorepo node_modules
  // (docs/ARCHITECTURE.md §2, parkap-devops skill).
  output: 'standalone',
};

export default nextConfig;
