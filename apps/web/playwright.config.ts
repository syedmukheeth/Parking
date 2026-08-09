import { defineConfig, devices } from '@playwright/test';

/**
 * Needs the full stack running (web :3000, api :4000, worker attached, real
 * Neon/Upstash) - `npm run dev` from the repo root, then `npm run e2e -w
 * @parkap/web` in another terminal. Not run in this environment; see
 * e2e/README.md.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
