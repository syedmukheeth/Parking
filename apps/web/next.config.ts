import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // packages/shared ships as compiled JS; transpiling it keeps source maps
  // meaningful and lets the app consume it without a build-order surprise.
  transpilePackages: ['@parkap/shared'],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
