# CLAUDE.md: ParkAP house rules

Instructions for AI agents and new contributors working in this repository. Read this before writing code here.

Project background: [README.md](README.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/DATA-MODEL.md](docs/DATA-MODEL.md) · [docs/API-CONTRACT.md](docs/API-CONTRACT.md) · [docs/ROADMAP.md](docs/ROADMAP.md)

---

## What this is

ParkAP: a smart parking platform for Andhra Pradesh. Currently building **Phase 1 MVP, citizen portal core**: search → live availability → reserve → QR entry → history.

npm workspaces + Turbo monorepo. Stack: Next.js 15 / React 19 · NestJS · PostgreSQL (Neon) · Prisma · Redis (Upstash) · BullMQ · Socket.IO · Better Auth · Razorpay · Sentry + OpenTelemetry · Vitest + Playwright + MSW.

```
apps/web          Next.js 15 App Router. Presentation + Better Auth (owns sessions).
apps/api          NestJS + Prisma + Socket.IO. All business rules, all DB access. Verifies sessions.
apps/worker       BullMQ workers. Background jobs: notifications, invoices, snapshots.
packages/shared   Zod schemas + types. The contract across all three apps.
```

Detailed, enforced rules live in `.claude/skills/parkap-*`. Consult them: `parkap-architecture`, `parkap-backend`, `parkap-frontend`, `parkap-testing`, `parkap-devops`, `parkap-domain`.

---

## Non-negotiables

These cause expensive, hard-to-reverse damage when broken. Do not violate them without an explicit decision recorded in `docs/ARCHITECTURE.md`.

### 1. Postgres from day one (Neon), use it well

Dev and prod both run **PostgreSQL** (Neon), so use native features: real `enum`s, relations, `@@index`, `@db` types. Every enum is mirrored as a Zod enum in `packages/shared` so the API boundary validates the same set. Schema changes ship as committed `prisma migrate` migrations, never `db push` against a shared branch. Full detail in [docs/DATA-MODEL.md](docs/DATA-MODEL.md).

### 2. Money is integer paise

Never a float. Never rupees. `amount: 4000` is ₹40.00. Formatting happens at the edge, in the UI.

### 3. Times are UTC `DateTime`; wall-clock schedules are `"HH:mm"` strings

Server clock is authoritative for holds, expiry, and overstay. Never trust a client timestamp for anything that affects money or capacity.

### 4. Stubs live behind interfaces, and never reach production

`OtpProvider`, `PaymentProvider`, `CacheStore`. Swapping stub → real is a new file plus an env var, never a refactor of call sites. Interfaces are shaped by what the domain needs, not by a vendor SDK, an interface that mirrors Razorpay's API is not an abstraction.

The API **throws on boot** if a stub provider is active while `NODE_ENV=production`. That guard is load-bearing: the stub OTP accepts `123456` for every phone number, so shipping it is a complete authentication bypass. Do not remove or weaken it.

### 5. The capacity check is the correctness core

Every reservation runs it inside a Prisma transaction. Two details:

- **Strict inequality on both overlap bounds.** `startAt < requestedEnd AND endAt > requestedStart`. Using `<=` silently halves effective capacity at every hour boundary.
- **Cached availability never authorises a booking.** The cache informs the UI. The transaction decides. A stale hold rejecting a valid booking is recoverable; a double-booking is not.

### 6. Booking status changes go through the state machine

`PENDING → CONFIRMED → ACTIVE → COMPLETED`, plus `CANCELLED` / `EXPIRED`. Legal transitions are declared as data and enforced in one place. No service assigns `booking.status` directly, a machine that can be bypassed becomes decorative within a month.

### 7. Auth lives in web (Better Auth); api verifies, never re-implements

Better Auth runs in `apps/web` and owns sessions. Session tokens live in **httpOnly cookies**, never `localStorage`, an XSS on a page holding a token in `localStorage` is an account takeover. `apps/api` validates the forwarded session via `SessionGuard` and applies RBAC; it does not duplicate auth logic.

### 8. Webhook handling is idempotent

Keyed by `providerPaymentId`. Payment gateways retry. A non-idempotent handler double-issues tickets.

### 9. Types are defined once, in `packages/shared`

Status unions, DTOs, filter shapes, error codes. The API validates against those Zod schemas; the web client types its fetches against the same ones. A type that exists in two places is a bug.

---

## Conventions

### Backend

- Controllers do HTTP only: parse, delegate, serialise. No logic.
- Services own the rules. A service may call another service; never another module's controller.
- Only `PrismaService` instantiates a Prisma client.
- Every inbound boundary validates with the Zod schema from `packages/shared`.
- Errors are thrown as typed domain errors and mapped to the codes in [docs/API-CONTRACT.md](docs/API-CONTRACT.md) by the global filter. Never return a stack trace.

### Frontend

- Server Components by default. Client Components only for interaction or socket subscriptions.
- No business logic in the web app. If a rule matters, it belongs in the API, the client can be bypassed.
- All fetches go through `lib/api.ts`. No bare `fetch` to the API in a component.
- Every data view handles loading, error, and empty states. Empty is not an edge case in a parking app, it is Tuesday morning.
- No hardcoded user-facing strings. Telugu is a launch requirement; externalise from the first render.

### Naming

| | |
|---|---|
| Files | kebab-case (`booking.service.ts`, `location-card.tsx`) |
| Types and components | PascalCase |
| Variables and functions | camelCase |
| Constants and status values | SCREAMING_SNAKE |
| DB columns | camelCase in Prisma; the mapping is Prisma's problem |

---

## Working here

### Before changing anything

1. Read the phase in [docs/ROADMAP.md](docs/ROADMAP.md), the work may be deliberately deferred rather than missing.
2. Check `packages/shared`, the type probably exists.
3. Check [docs/API-CONTRACT.md](docs/API-CONTRACT.md), the endpoint shape is likely already specified.

### Before saying it works

- `npm run typecheck` passes
- `npm run test` passes
- The flow was actually driven end to end in the browser, not just unit-tested

Claiming a booking flow works because a service test passes is not a verification. Run it.

### Commands

```bash
npm run dev          # api :4000 + web :3000
npm run db:setup     # generate + push + seed, idempotent
npm run db:reset     # drop dev.db, rebuild
npm run db:studio    # data browser
npm run typecheck
npm run test
```

Dev login: any phone, OTP `123456`. The code is printed to the API console.

---

## Traps in this codebase

Things that look right and are not:

| Trap | Reality |
|---|---|
| `priceFrom` on a search result | Display only, cheapest hourly rate across slot types. Never price a booking from it. |
| Availability from a socket delta | Advisory. Snapshot on reconnect replaces it. Never gate a booking on it. |
| Extending a booking | Re-checks capacity for the **added interval only**, and can legitimately fail. Not an error state, a normal outcome the UI must present. |
| `<=` in the overlap query | Halves capacity at hour boundaries. Always strict on both sides. |
| Storing open/close as `DateTime` | They are wall-clock daily schedules with no date and no timezone. Strings. |
| `totalCapacity` on `ParkingLocation` | Does not exist, deliberately. Capacity lives on `SlotType` and would drift if denormalised. |
| Seed data named "Test Lot 1" | Use real AP place names. Fake names hide geo bugs and derail stakeholder reviews. |

---

## Scope discipline

The proposal describes four platforms and dozens of features. This slice builds **the citizen core only**. The operator dashboard, municipal dashboard, staff app, real payments, invoices, WhatsApp, passes, and AI features are deferred with named seams to attach to, see [docs/ROADMAP.md](docs/ROADMAP.md).

Do not build ahead of the roadmap. An operator dashboard bolted on during Phase 4 will be built against a booking engine that is still changing shape.

If a change looks like it needs work from a later phase, say so and stop, do not quietly expand the slice.
