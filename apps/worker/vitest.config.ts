import { defineConfig } from 'vitest/config';

/**
 * Worker specs are unit-level and need nothing beyond Node — the Prisma
 * singleton (`src/prisma.ts`) is mocked per-spec rather than pointed at a
 * database. The DB-backed proofs (capacity race, QR replay, webhook
 * idempotency) live in apps/api's integration suite, which owns those rules.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
