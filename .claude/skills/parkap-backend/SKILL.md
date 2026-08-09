---
name: parkap-backend
description: NestJS + Prisma + Postgres + Redis + BullMQ + Socket.IO backend conventions for ParkAP: repository pattern, service layer, DI, transactions, index/query optimization, background jobs, real-time gateways, and the booking-engine correctness rules. Use when writing or reviewing any code in apps/api or apps/worker.
---

# ParkAP Backend

Conventions for `apps/api` (NestJS) and `apps/worker` (BullMQ). Pairs with `parkap-architecture` and `../../../docs/DATA-MODEL.md`, `../../../docs/API-CONTRACT.md`.

## Module wiring (NestJS)

- One module per feature, imports its repository + service, exports the service if another feature needs it.
- Providers registered by **interface token**, not concrete class:
  ```ts
  { provide: OTP_PROVIDER, useClass: process.env.AUTH_PROVIDER === 'stub' ? StubOtpProvider : Msg91OtpProvider }
  ```
- `PrismaModule` is global; `PrismaService` extends `PrismaClient`, connects `onModuleInit`, disconnects `onModuleDestroy`.
- Config via `@nestjs/config` with a **Zod-validated** env schema loaded at boot: invalid env crashes the process, never runs degraded.

## Repository pattern

All Prisma for a feature lives in its repository. Services never touch `this.prisma` directly.

```ts
// booking.repository.ts, owns queries
countOverlapping(slotTypeId, start, end, tx) { ... }   // takes an optional tx client
// booking.service.ts: owns rules, opens the transaction
```

Repositories accept an optional transaction client so a service can compose several repo calls in one `$transaction`.

## Transactions

- Use `prisma.$transaction(async (tx) => …)` for any multi-write invariant.
- The **capacity check + booking insert** must be one transaction. Read overlap count, compare to capacity, insert, all inside `tx`. Set isolation to `Serializable` for the booking write so two racing txns can't both see the last slot free.
- Retry serialization failures (Postgres `40001`) a bounded number of times, then surface `SLOT_UNAVAILABLE`.

## The capacity query (correctness core)

```
available = capacity
          − count(status IN ('CONFIRMED','ACTIVE') AND startAt < reqEnd AND endAt > reqStart)
          − activeHolds(cache)
```

- **Strict `<` / `>` on both bounds.** `<=` halves capacity at every hour boundary.
- Cache holds only make the system more conservative; the transaction decides.
- Extend re-checks the **added interval only**.
- This path has a dedicated concurrency test: N parallel attempts on the last slot → exactly one confirmation.

## Query & index rules

- Every query a user can trigger must hit an index. Booking capacity: `@@index([slotTypeId, status, startAt, endAt])`. History: `@@index([userId, createdAt])`.
- No N+1, use `include`/`select` deliberately; never loop queries.
- `select` only the columns needed for the response; don't over-fetch and serialise the whole row.
- Geo: bounding-box `where` on indexed `lat`/`lng`, then Haversine in JS. PostGIS is a later, explicit upgrade.
- Paginate every list (`take`/`skip` or cursor); no unbounded `findMany`.
- Money columns are `Int` (paise). Never `Float`, never `Decimal` unless a rate needs sub-paise precision, then document it.

## Prisma schema (Postgres from day one via Neon)

Real Postgres, so **use native features**: `enum`, relations, `@@index`, `@db` types. The old SQLite portability contract is retired. Still:
- Migrations via `prisma migrate`: every schema change is a committed migration, never `db push` against a shared DB.
- `onDelete` behaviour explicit on every relation.
- Enums in Prisma AND mirrored as Zod enums in `packages/shared` so the API boundary validates the same set.

## Background jobs (BullMQ + Upstash Redis)

Anything slow, retryable, scheduled, or fire-and-forget goes to `apps/worker`, not an HTTP request path:

- Invoice PDF generation, notification sends (Novu/Resend/FCM), availability snapshots, hold-expiry sweeps, webhook post-processing.
- Every job: idempotent handler, explicit `attempts` + backoff, a dead-letter path, structured logging with the job id.
- Producers live in api services (`queue.add(...)`); consumers live only in `apps/worker`.
- Never do in a request what a job can do async: the request returns fast, the job owns the retry.

## Real-time (Socket.IO)

- Namespace `/realtime`, one **room per location id**.
- Booking/ticket events emit occupancy deltas into the room.
- Fresh DB **snapshot on connect and reconnect** so cache drift self-heals.
- Authenticated sockets for `booking:updated`; availability is public.
- At multi-instance scale, add the Socket.IO Redis adapter (Upstash), rooms then span instances.

## Providers (interfaces, env-selected)

`OtpProvider`, `PaymentProvider`, `CacheStore`. Mock/stub now, real later, swap = new file + env var. **Boot guard**: throw if a stub is active under `NODE_ENV=production`, stub OTP accepts a fixed code and is a full auth bypass if shipped.

## Errors & validation

- Validate every inbound boundary with the Zod schema from `packages/shared` via a global `ZodValidationPipe`.
- Throw typed domain errors; a global exception filter maps them to the stable `code`s in API-CONTRACT.md. Never leak a stack trace.
- Log with correlation ids (request id propagated to jobs and logs).

## Security (see also the `security` and `claude-security` skills)

- RBAC via `@Roles()` + `RolesGuard` (`CITIZEN|OPERATOR|ADMIN`), wired from day one.
- Rate-limit OTP and booking routes (`@nestjs/throttler` backed by Redis).
- Parameterised queries only (Prisma handles this, no raw string interpolation into `$queryRaw`).
- Verify Razorpay webhook signatures before trusting a payload; handle idempotently by `providerPaymentId`.
