# Architecture

How ParkAP is put together, and why.

---

## 1. Shape of the system

```
┌─────────────────┐         ┌─────────────────┐
│  Citizen Web    │         │  Operator /     │
│  Next.js 15     │         │  Staff / Municipal
│  (this slice)   │         │  (later phases) │
└────────┬────────┘         └────────┬────────┘
         │ REST + WebSocket           │
         └────────────┬───────────────┘
                      ▼
         ┌────────────────────────────┐
         │        NestJS API          │
         │                            │
         │  auth ─ locations ─ bookings
         │  tickets ─ payments ─ realtime
         │                            │
         │  ┌──────────────────────┐  │
         │  │ Provider interfaces  │  │
         │  │ Otp │ Payment │ Cache│  │
         │  └──────────────────────┘  │
         └────────┬───────────────────┘
                  ▼
         ┌────────────────────────────┐
         │ Prisma → SQLite (dev)      │
         │          PostgreSQL (prod) │
         └────────────────────────────┘
```

One API serves every client. The citizen portal is the first consumer; the operator dashboard, staff app, and municipal dashboard are additional consumers of the same core, with role-gated routes. This is why RBAC exists from day one even though only citizen routes are built — adding the operator dashboard later must not require re-plumbing auth.

---

## 2. Workspace layout

npm workspaces, three packages.

```
apps/web        Next.js. Presentation + Better Auth (owns sessions). No business logic, no direct DB.
apps/api        NestJS. Owns all business rules and all database access. Verifies sessions.
apps/worker     BullMQ workers. Background jobs — notifications, invoices, snapshots, hold-sweeps.
packages/shared Zod schemas + types. Imported by all three. Owns nothing at runtime.
```

**`packages/shared` is the contract.** Status unions, request/response DTOs, filter shapes, and error codes are declared once there. The API validates inbound requests against those Zod schemas; the web client types its fetches against the same ones. When the shape changes, both sides fail to compile together — which is the point.

A type defined in two places is a bug, not a duplication.

---

## 3. API module map

| Module | Responsibility |
|---|---|
| `common/` | Exception filter, validation pipe, logging interceptor, `CacheStore`, guards |
| `prisma/` | `PrismaService` — the only place a Prisma client is instantiated |
| `auth/` | OTP request/verify, JWT issue/refresh, `JwtAuthGuard`, `RolesGuard` |
| `locations/` | Search with geo + filters, detail, availability |
| `bookings/` | Quote, reserve, cancel, extend. State machine. Pricing engine. |
| `tickets/` | QR issue, verify (check-in), exit (check-out) |
| `payments/` | Provider interface, mock provider, webhook receiver |
| `realtime/` | Socket.IO gateway, per-location rooms, occupancy deltas |

Rules:
- Controllers do HTTP only — parse, delegate, serialise. No logic.
- Services own the rules. A service may call another service; it never calls another module's controller.
- Only `PrismaService` touches the database. No raw client instantiation anywhere else.

---

## 4. The booking lifecycle

This is the heart of the product. Everything else is presentation around it.

```
  quote        reserve         payment ok      QR scan        QR exit
    │             │                │              │              │
    ▼             ▼                ▼              ▼              ▼
 (no state)   PENDING ──────▶  CONFIRMED ────▶ ACTIVE ────▶ COMPLETED
                 │  ▲                                │
        hold TTL │  │ hold                           │
         expires │  │ acquired                       │
                 ▼  │                                ▼
              EXPIRED                            CANCELLED
```

**Hold.** When a citizen starts a reservation, a short-TTL hold is written to `CacheStore` for that location and time window. The hold prevents a second citizen from taking the last slot while the first is inside the payment flow. If payment does not complete before the TTL, the hold evaporates and the booking becomes `EXPIRED`. No cleanup job required for the hold itself — TTL does the work.

**Capacity check.** Inside a Prisma transaction, the service counts confirmed bookings whose time window overlaps the requested one, adds active holds, and compares against the slot-type capacity. This single query is the correctness core of the system. It is the one piece with a dedicated concurrency test: N simultaneous attempts on the last slot must produce exactly one confirmation.

**Extend** re-quotes for the extended window and re-runs the capacity check for the *added* interval only. An extension can legitimately fail because the slot is booked by someone else later — the UI must handle that, not assume success.

---

## 5. Availability and realtime

Availability has two representations, deliberately:

- **Source of truth** — the database. Derived by counting bookings. Always correct, comparatively slow.
- **Live counter** — `CacheStore`. Fast, pushed over WebSocket, may drift.

Clients subscribe to a room per location id. Booking confirmations, cancellations, check-ins, and check-outs emit occupancy deltas into the room. On socket connect or reconnect, the client receives a fresh snapshot computed from the database — so drift self-heals rather than accumulating.

The rule: **never make a booking decision from the cached counter.** It informs the UI. The transactional capacity check decides.

---

## 6. Provider interfaces

Three seams where a stub stands in for a real service. Each is an interface with a mock implementation now and a real implementation later, selected by environment variable.

| Seam | Interface | Dev | Production |
|---|---|---|---|
| OTP delivery | `OtpProvider` | `StubOtpProvider` — accepts `123456` | MSG91 / Twilio |
| Payments | `PaymentProvider` | `MockPaymentProvider` — auto-succeeds | Razorpay |
| Cache / holds | `CacheStore` | Upstash Redis (day one) | Upstash Redis |

Each interface is defined by what the *domain* needs, not by the vendor's SDK shape — otherwise the interface leaks the vendor and the swap fails. `PaymentProvider` exposes `createOrder`, `verifySignature`, and `getStatus`; the mock webhook payload is shaped like Razorpay's so the real adapter is a new file rather than a refactor of the booking service.

**Safety guard:** the API throws on boot if a stub provider is selected while `NODE_ENV=production`. Shipping the fixed OTP code to production would be a full authentication bypass. The guard is not optional.

---

## 7. Data layer

Prisma against **PostgreSQL (Neon)** in both dev and prod — a Neon dev branch locally, main in prod. No SQLite step, so the schema uses Postgres natively: real `enum`s, relations, `@@index`, `@db` types. Every enum is mirrored as a Zod enum in `packages/shared` so the DB and the API boundary enforce the same set. Full detail in [DATA-MODEL.md](DATA-MODEL.md).

Schema changes ship as committed `prisma migrate` migrations; CI runs `migrate deploy` on per-PR Neon branches and fails on drift.

**Geo queries** use a bounding-box prefilter on indexed `lat`/`lng` followed by Haversine distance in JavaScript. PostGIS is a deliberate later upgrade once volume justifies it, not something to adopt at seed scale.

---

## 8. Web app

Next.js 15 App Router. Server Components for anything reading data at request time; Client Components only where interaction or a socket subscription demands it.

```
app/
  (marketing)/          landing
  (auth)/               phone + OTP
  search/               results, filters, map
  locations/[id]/       detail + booking flow
  bookings/             history
  bookings/[id]/        active ticket, QR, timer, extend
lib/
  api.ts                typed fetch client over packages/shared
  socket.ts             Socket.IO client, room subscribe/unsubscribe
  session.ts            httpOnly cookie session
components/
```

Session tokens live in **httpOnly cookies**, never `localStorage` — an XSS in a page with a `localStorage` token is an account takeover.

Strings are externalised from the first component. Telugu is a launch requirement, not a nice-to-have, and retrofitting i18n across a finished UI costs several times what doing it from the start costs.

---

## 9. What is deliberately not here yet

| Not built | Why |
|---|---|
| Operator / municipal / staff clients | Proposal Phase 2–3. API is shaped to accept them. |
| Real payment gateway | Needs a merchant account. Mock provider unblocks the flow. |
| GST invoice PDFs | Depends on real payments. |
| PostGIS | Overkill for seed-scale data; revisit at real volume. |
| ANPR, IoT sensors, FASTag | Proposal Phase 3, needs hardware and approvals. |
| AI pricing and prediction | Needs historical data this system has not yet generated. |

Each of these has a named seam it will attach to. None requires re-architecting what exists.

---

## 10. Known risks

| Risk | Mitigation |
|---|---|
| Double-booking under concurrency | Serializable transactional capacity check + Redis holds + serialization retry + a dedicated concurrency test |
| Schema drift across environments | Committed `prisma migrate` migrations; CI runs `migrate deploy` on per-PR Neon branches |
| Stub auth reaching production | Boot-time guard on `NODE_ENV` |
| Cached availability drifting from truth | DB snapshot on every connect/reconnect; cache never authorises a booking |
| QR token replay | Single-use, signed, expiring tokens; replay test in the suite |
| Clock skew on holds and expiry | All times stored UTC; server clock is authoritative, never the client's |
