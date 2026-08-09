import { defineConfig } from 'vitest/config';

/**
 * Unit specs (src/**\/*.spec.ts) need nothing beyond Node. Integration specs
 * (test/integration/**\/*.int-spec.ts) need a real Postgres - see
 * test/integration/README.md for how to point them at one. Both run under
 * `npm test`; CI (docs/ROADMAP.md Phase 14) runs integration specs against a
 * per-PR Neon branch.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.int-spec.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
