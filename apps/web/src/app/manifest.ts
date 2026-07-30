import type { MetadataRoute } from 'next';

/**
 * PWA manifest (docs/ROADMAP.md Phase 8). Icon files themselves
 * (icon-192.png, icon-512.png) are a design asset this pass doesn't produce —
 * drop real ones into apps/web/public/ before shipping; the app still
 * installs without them, just with a placeholder icon.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ParkAP — Andhra Pradesh Smart Parking',
    short_name: 'ParkAP',
    description: 'Find and reserve parking across Andhra Pradesh',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f766e',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
