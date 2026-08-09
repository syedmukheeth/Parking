import type { FullConfig } from '@playwright/test';

/**
 * Warms the routes the suite touches before any test runs.
 *
 * Against a dev server, Next compiles a route the first time it is requested.
 * That cost lands on whichever test happens to hit it first, which made the
 * first test in each file fail on a cold run and pass on a warm one. Charging
 * compile time to an assertion turns a slow build into a red suite.
 *
 * The map routes matter most: MapLibre is a dynamic import, so its chunk is
 * built on demand and takes the longest.
 */
const ROUTES = [
  '/',
  '/welcome',
  '/search',
  '/search?q=Kurnool',
  '/search?q=Vijayawada',
  '/locations/loc_tirumala_main',
  '/locations/loc_vja_benz_circle',
  '/bookings',
  '/saved',
  '/profile',
  '/sign-in',
];

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3000';

  // Sequential on purpose: hammering a dev server with parallel cold compiles
  // is slower than letting it build one route at a time.
  for (const route of ROUTES) {
    try {
      await fetch(new URL(route, baseURL));
    } catch {
      // A route that will not even respond is the tests' problem to report,
      // with a real assertion and a useful message. Warming is best-effort.
    }
  }
}
