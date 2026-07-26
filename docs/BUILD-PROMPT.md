# Build Prompt — ParkAP Phase 1 MVP

A single, self-contained execution brief for an AI agent (or a new engineer) taking this repository from documentation to a running citizen parking portal. Paste the **Standing Prompt** below into a fresh session; everything after it is the reference the prompt points at.

---

## Standing Prompt

> You are the lead engineer on **ParkAP**, a smart parking platform for Andhra Pradesh. The repository at hand contains a complete design — `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `docs/API-CONTRACT.md`, `docs/ROADMAP.md` — and enforced house rules in `.claude/skills/parkap-*`. Your job is to implement **Phase 1 MVP, citizen portal core**: search → live availability → reserve → QR entry → history.
>
> **Read before writing.** Consult the roadmap phase you are on, then `packages/shared` (the type probably exists), then the API contract (the endpoint shape is probably specified). Load the matching `parkap-*` skill for the layer you are touching.
>
> **Work phase by phase, in order (0 → 14).** Each phase must end in a tree that boots, typechecks, and passes its own "Done when" gate before the next phase starts. Never leave a phase half-wired across a boundary. Do not build ahead of the roadmap — if a task appears to need work from a later phase, say so and stop rather than quietly widening the slice.
>
> **The nine non-negotiables in `CLAUDE.md` are hard constraints**, not preferences. In particular: money is integer paise; times are UTC `DateTime` and wall-clock schedules are `"HH:mm"` strings; the capacity check runs inside a serializable transaction with strict inequality on both overlap bounds; cached availability never authorises a booking; booking status changes go through the state machine; auth lives in `apps/web` (Better Auth) and `apps/api` only verifies; webhook handling is idempotent by `providerPaymentId`; stub providers throw on boot under `NODE_ENV=production`; types are defined once, in `packages/shared`.
>
> **Definition of done for any phase:** `turbo run typecheck lint test` passes, the phase's stated gate is demonstrated with real output (a curl response, a test run, a browser session — not an assertion that it should work), and the change is committed with a Conventional Commit message. A booking flow is not verified because a service test passes. Drive it.
>
> **When blocked on an external credential** (Neon, Upstash, Better Auth secret, Google Maps, Sentry), implement everything that does not depend on it, write the code path that will use it behind Zod-validated env config, note the block explicitly, and continue with the rest of the phase. Do not stub around a missing credential in a way that survives into production.
>
> Report progress as: phase, what landed, what the gate showed, what is blocked.

---

## 1. What is being built

A citizen finds parking near a destination in Andhra Pradesh, sees how many slots are actually free right now, reserves one for a time window, pays, receives a QR ticket, is scanned in at the gate, and can extend or review the booking afterwards.

Everything else in the original proposal — operator dashboard, municipal dashboard, staff app, real Razorpay, GST invoices, WhatsApp, passes, AI pricing — is **deferred with named seams**, listed in `docs/ROADMAP.md`. The seams exist so those slices attach later without re-architecting: `Operator` and RBAC exist from day one, `PaymentProvider` and `OtpProvider` are interfaces, `AvailabilitySnapshot` accrues training data from the first booking.

## 2. Shape of the work

```
apps/web          Next.js 15 App Router · presentation + Better Auth (owns sessions)
apps/api          NestJS + Prisma + Socket.IO · all business rules, all DB access
apps/worker       BullMQ consumers · tickets, notifications, invoices, snapshots
packages/shared   Zod schemas + types · the contract across all three
```

Stack: Next.js 15 / React 19 · NestJS · PostgreSQL (Neon) · Prisma · Redis (Upstash) · BullMQ · Socket.IO · Better Auth · Razorpay (deferred, mocked) · Sentry + OpenTelemetry · Vitest + Playwright + MSW · Turbo · Coolify.

## 3. The correctness core

If exactly one thing in this system must be right, it is this:

```
available = slotType.capacity
          − count(bookings WHERE slotTypeId = ?
                             AND status IN ('CONFIRMED','ACTIVE')
                             AND startAt < requestedEnd
                             AND endAt   > requestedStart)
          − activeHolds(slotTypeId, requestedStart, requestedEnd)
```

Run inside a **Serializable** Prisma transaction with retry on serialization failure. Strict inequality on both bounds — `<=` silently halves capacity at every hour boundary. Holds come from the cache, capacity from the database: the cache may only ever make the system more conservative. A stale hold rejecting a valid booking is recoverable; a double-booking is not.

Extensions re-run this check for the **added interval only**, and may legitimately fail. That is a normal outcome the UI presents, not an error state.

This gets a dedicated concurrency test: N parallel attempts on the last slot produce exactly one confirmation.

## 4. Phase plan and gates

Each phase ends in a state that runs. The gate is what you demonstrate before moving on.

| # | Phase | Gate |
|---|---|---|
| 0 | Workspace & tooling | `turbo run typecheck lint` passes on the empty tree |
| 1 | Domain model (Neon Postgres) | `migrate deploy` + idempotent seed on a Neon dev branch; Studio shows plausible AP data |
| 2 | Locations API | curl returns seeded lots, correctly filtered and distance-sorted from a Vizag coordinate |
| 3 | Auth (Better Auth + NestJS verify) | phone → session in web; a guarded api route rejects anonymous, accepts a valid session |
| 4 | Booking engine | N parallel attempts on the last slot → exactly one confirmation, proven by a real concurrency test |
| 5 | Tickets & QR | a QR scans once to `ACTIVE`; replay → `TICKET_ALREADY_USED` |
| 6 | Realtime availability | two tabs on one location both update within a second of a booking |
| 7 | Payments abstraction + worker | a booking reaches `CONFIRMED` via a worker job; failure releases the hold |
| 8 | Web shell | app boots, calls the api, renders a real seeded location, installable as a PWA |
| 9 | Search & discovery | searching "Tirupati" returns seeded lots with live-updating availability |
| 10 | Location detail & booking flow | a citizen completes search-to-confirmed-booking without touching curl |
| 11 | Active ticket | an active booking shows a scannable QR and extends successfully |
| 12 | History & profile | past/upcoming bookings render; repeat-booking pre-fills |
| 13 | Hardening & testing | the must-have test set passes; the api returns structured errors, never stack traces |
| 14 | Observability & deploy | the stack deploys via CI to Coolify; traces and errors land in Sentry/OTel |

Full detail per phase — including what is explicitly out of each one — lives in `docs/ROADMAP.md`.

## 5. Invariants that outlive any single phase

1. **Money is integer paise.** Never a float, never rupees. `amount: 4000` is ₹40.00. Formatting happens at the UI edge only.
2. **Times are UTC `DateTime`.** Wall-clock daily schedules (`openTime`, `closeTime`, pricing windows) are `"HH:mm"` strings — they have no date and no timezone. The server clock is authoritative for holds, expiry, and overstay; never trust a client timestamp for anything affecting money or capacity.
3. **Booking status only ever changes through the state machine.** `PENDING → CONFIRMED → ACTIVE → COMPLETED`, plus `CANCELLED` / `EXPIRED`. Legal transitions are declared as data and enforced in one place. No service assigns `booking.status` directly.
4. **`packages/shared` is the single definition site** for status unions, DTOs, filter shapes, and error codes. The API validates against those Zod schemas; the web client types its fetches against the same ones. A type in two places is a bug.
5. **Auth lives in web; the api verifies.** Session tokens in httpOnly cookies, never `localStorage`. `SessionGuard` + `@Roles()` in the api; no duplicated auth logic.
6. **Idempotency by `providerPaymentId`** on every payment webhook. Gateways retry.
7. **Stub providers throw on boot under `NODE_ENV=production`.** The stub OTP accepts `123456` for every phone — shipping it is a complete authentication bypass. That guard is load-bearing.
8. **Every inbound boundary validates** with the Zod schema from `packages/shared`. Errors are thrown as typed domain errors and mapped to the codes in `docs/API-CONTRACT.md` by the global filter. Stack traces are never returned.
9. **Schema changes ship as committed `prisma migrate` migrations.** Never `db push` against a shared branch.

## 6. Traps this codebase sets

| Looks right | Actually |
|---|---|
| `priceFrom` on a search result | Display only — cheapest hourly rate across slot types. Never price a booking from it. |
| Availability from a socket delta | Advisory. The reconnect snapshot replaces it. Never gate a booking on it. |
| Extending a booking | Re-checks capacity for the added interval only, and can legitimately fail. Normal outcome, not an error. |
| `<=` in the overlap query | Halves capacity at hour boundaries. Strict on both sides, always. |
| Storing open/close as `DateTime` | Wall-clock schedules. Strings. |
| `totalCapacity` on `ParkingLocation` | Deliberately absent. Capacity lives on `SlotType` and would drift if denormalised. |
| Seed data named "Test Lot 1" | Use real AP place names. Fake names hide geo bugs and derail stakeholder reviews. |

## 7. Test set that must exist by Phase 13

- **Capacity race** — N concurrent reservations on the last slot, exactly one wins.
- **QR replay** — a verified token presented twice returns `TICKET_ALREADY_USED`.
- **State machine** — every illegal transition returns `INVALID_TRANSITION`; every legal one succeeds.
- **Pricing engine** — pure-function tests over rule priority, free minutes, day masks, and window boundaries, in paise.
- **Webhook idempotency** — the same `providerPaymentId` delivered twice issues one ticket.
- Plus: MSW component tests on the web app, and a Playwright happy path with axe accessibility assertions.

## 8. Working rhythm

Per phase:

1. Read the roadmap entry and the relevant `parkap-*` skill.
2. Check `packages/shared` and `docs/API-CONTRACT.md` before defining anything new.
3. Implement, smallest coherent unit first, backend before the UI that consumes it.
4. Run `turbo run typecheck lint test`.
5. Demonstrate the phase gate with real output.
6. Commit with a Conventional Commit message scoped to the app (`feat(api): …`, `fix(web): …`).

## 9. External blocks

Implement around these; do not fake them into production paths.

| Need | Blocks | Needed by |
|---|---|---|
| Neon connection string | Everything | Phase 0–1 |
| Upstash Redis URL/token | Holds, realtime scale-out, rate limits | Phase 4 |
| Better Auth secret | Sessions | Phase 3 |
| Google Maps API key | Map view only — list view unaffected | Phase 9 |
| Sentry DSN, PostHog key | Observability | Phase 14 |
| Razorpay merchant account | Real payments (deferred) | Proposal Phase 2 |
| SMS gateway account | Real OTP (deferred) | Proposal Phase 2 |

## 10. What "done" means for the slice

Run the end-to-end acceptance in `docs/ROADMAP.md`: install, `db:setup` against a Neon dev branch, `npm run dev`, sign in with any phone and OTP `123456`, search Tirupati, book two hours, mock-pay, watch the worker issue the ticket, open the ticket page with a live QR and countdown, extend it, verify the QR once and see the replay rejected, watch a second tab's availability drop live, find the booking in history, and see repeat-booking pre-fill. Then `turbo run test` with the must-have set green.

Anything less is a partial slice, and should be reported as one.
