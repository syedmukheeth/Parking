---
name: parkap-architecture
description: Architecture rules for the ParkAP monorepo — feature-first structure, clean-architecture layering, DDD boundaries, SOLID, and the project non-negotiables. Use when adding a feature, creating a module, deciding where code lives, reviewing structure, or when a change crosses app boundaries (api/web/worker/shared).
---

# ParkAP Architecture

Authoritative structure and layering rules for this repo. When a placement decision is ambiguous, this skill decides. Background: `../../../docs/ARCHITECTURE.md`, `../../../CLAUDE.md`.

## Stack (production target)

Next.js 15 + React 19 + TS · NestJS · PostgreSQL (Neon) · Prisma · Redis (Upstash) · BullMQ · Socket.IO · Better Auth · Razorpay · Sentry + OpenTelemetry · Vitest + Playwright + MSW.

## Monorepo shape

```
apps/
  web/       Next.js 15 — presentation + Better Auth (owns sessions)
  api/       NestJS — business rules, all DB access, Socket.IO
  worker/    BullMQ workers — background jobs (notifications, invoices, snapshots)
packages/
  shared/    types + Zod schemas — the cross-app contract
  config/    shared eslint/tsconfig/prettier bases (add when standards land)
```

Auth split: **web owns Better Auth**, api **verifies** the session token via a guard. Never duplicate auth logic in api — validate, don't re-implement.

## Feature-first, inside each app

Group by feature, not by technical type. A feature owns its whole vertical.

```
apps/api/src/features/bookings/
  bookings.module.ts
  bookings.controller.ts      HTTP only
  bookings.service.ts         orchestration + rules
  booking.repository.ts       all Prisma for this feature
  pricing.engine.ts           pure domain logic
  booking.state-machine.ts    transitions as data
  dto/                        Zod-derived DTOs from @parkap/shared
  bookings.spec.ts
```

```
apps/web/src/features/search/
  components/  hooks/  actions.ts  api.ts  schema.ts
```

`src/components/`, `src/lib/` hold only cross-feature shared code. If two features need it, it moves up; until then it stays in the feature.

## Clean-architecture layering (api)

Dependencies point inward. Outer may import inner; never the reverse.

```
controller → service → repository → PrismaService
                ↓
           domain (pure: pricing.engine, state-machine) — imports nothing framework
```

- **Controller** — parse, validate against Zod, delegate, serialise. No logic, no Prisma.
- **Service** — owns rules, transactions, orchestration. Calls repositories + domain. May call other services, never another controller.
- **Repository** — the only place Prisma is touched for a feature. Returns domain shapes, not raw Prisma types leaking `include` internals.
- **Domain** — pure functions/classes, framework-free, unit-tested in isolation (pricing, capacity math, state transitions).

Reference patterns (understand, don't copy): NestJS DI + modules; Prisma transactions via `$transaction`.

## SOLID applied here

- **S** — a service does one feature's rules; extract `PricingEngine`, `StateMachine` rather than fattening `BookingService`.
- **O** — new payment provider / OTP provider / cache driver = new class implementing the interface, no edits to callers.
- **L** — every `PaymentProvider` impl must satisfy the same contract incl. idempotency; a mock that skips signature verification is a Liskov violation waiting to page someone.
- **I** — provider interfaces expose what the domain needs (`createOrder`/`verifySignature`/`getStatus`), not the vendor SDK surface.
- **D** — services depend on interfaces (`OtpProvider`, `PaymentProvider`, `CacheStore`), resolved by Nest DI tokens, not on concrete classes.

## The contract package

Every status union, DTO, filter shape, and error code lives once in `packages/shared` as a Zod schema + inferred type. api validates inbound with it; web types fetches with it. A type defined twice is a bug. See `parkap-domain` rules below.

## Non-negotiables (full list in CLAUDE.md)

1. Money = integer **paise**, never float.
2. Times = UTC `DateTime`; wall-clock schedules = `"HH:mm"` strings. Server clock authoritative.
3. Stubs behind interfaces; API throws on boot if a stub provider runs under `NODE_ENV=production`.
4. Capacity check inside a transaction, **strict inequality** on both overlap bounds. Cache never authorises a booking.
5. Booking status only changes through the state machine.
6. Session tokens in httpOnly cookies, never `localStorage`.
7. Webhooks idempotent by `providerPaymentId`.

## Placement decision guide

| Question | Answer |
|---|---|
| Business rule? | api service or domain — never web |
| DB query? | feature repository only |
| Shared type? | `packages/shared` |
| Long/retryable/scheduled work? | `apps/worker` BullMQ job |
| Real-time push? | api `realtime` gateway |
| Cross-feature UI? | `apps/web/src/components` |
| Vendor integration? | behind an interface in the owning feature |

## Anti-patterns to reject in review

- Prisma client imported outside a repository
- Business logic in a controller or a React component
- `web` calling the DB directly (it must go through api)
- Building operator/municipal/staff features while the booking engine is still changing (respect roadmap phases)
- Adding a dependency that duplicates one already in the stack
