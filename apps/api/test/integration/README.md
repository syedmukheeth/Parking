# Integration tests

These run against a **real Postgres** database - transactions and Serializable
conflict behaviour are exactly what the capacity-race and webhook-idempotency
tests exercise, and a mock would hide the thing being tested (parkap-testing
skill).

## Setup

1. Create a dedicated test database - a throwaway Neon branch works well, or
   any local/managed Postgres you don't mind truncating. **Never point this
   at the dev or prod database.**
2. Apply the schema to it:
   ```bash
   TEST_DATABASE_URL="postgresql://..." npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
   ```
   (with `DATABASE_URL` temporarily set to the same value, since `migrate deploy`
   reads `DATABASE_URL`/`DIRECT_URL`, not `TEST_DATABASE_URL`).
3. Run the suite:
   ```bash
   TEST_DATABASE_URL="postgresql://..." npm run test -w @parkap/api
   ```

Each spec truncates the tables it touches in `beforeEach` and seeds its own
minimal fixture (`fixtures.ts`) - order-independent, safe to re-run.

## What's covered

| File | Guards |
|---|---|
| `capacity-race.int-spec.ts` | N parallel reservations on the last slot → exactly one succeeds, the rest `SLOT_UNAVAILABLE` - the single most important test in the repo |
| `overlap-boundary.int-spec.ts` | A booking ending at 14:00 does not conflict with one starting at 14:00 |
| `qr-replay.int-spec.ts` | A ticket verifies once → `ACTIVE`; replay → `TICKET_ALREADY_USED` |
| `webhook-idempotency.int-spec.ts` | The same `providerPaymentId` delivered twice confirms the booking once, not twice |

These have not been run in this environment - there is no live Postgres
connection available here. Run them against a real test database before
relying on them as a merge gate.
