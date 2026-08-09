# Roadmap

Phase 1 delivery - **Citizen Portal Core** on an enterprise foundation. Fifteen phases (0–14), each ending in a state that runs. Nothing is left half-wired across a phase boundary.

Legend: ☐ not started · ◐ in progress · ☑ done

Stack: Next.js 15 / React 19 · NestJS · PostgreSQL (Neon) · Prisma · Redis (Upstash) · BullMQ · Socket.IO · Better Auth · Razorpay · Sentry + OpenTelemetry · Vitest + Playwright + MSW · Coolify. Architecture rules: `.claude/skills/parkap-*`.

---

## Scope of this slice

**In:** citizen search, live availability, location detail, reservation, QR entry, ticket timer/extend, booking history, Better-Auth phone-OTP (stub), mock payments through a real worker pipeline.

**Out (Proposal Phase 2–3, seams left in place):** operator/municipal dashboards, staff app, real Razorpay, GST invoices, Novu/Resend/FCM notifications, monthly passes, corporate accounts, reviews, AI features, ANPR/IoT, Meilisearch/Typesense.

Payments weren't in the original slice request, but a reservation can't reach a terminal state without a payment outcome - so Phase 7 builds the payment *abstraction* + mock provider + worker pipeline. Real gateway stays deferred.

---

## Phase 0 - Workspace & tooling ☑
npm workspaces + Turbo. `apps/web|api|worker`, `packages/shared`. TS strict, ESLint + Prettier, Zod-validated env per app, `.env.example`, `.gitignore`, `git init`. Sentry + OTel bootstrap (no-op without keys). `docker-compose.yml` for deploy only.
**Done when:** `turbo run typecheck lint` passes on the empty tree.

## Phase 1 - Domain model (Neon Postgres) ☑
`packages/shared` Zod contract. `schema.prisma` with native Postgres enums/relations/indexes. Models: `User`, `Operator`, `ParkingLocation`, `SlotType`, `PricingRule`, `LocationTag`, `Booking`, `Ticket`, `Payment`, `AvailabilitySnapshot`, `Vehicle`, `FavouriteLocation`. First migration + idempotent seed with real AP locations (Tirumala, Vizag RK Beach, Vijayawada Benz Circle, Guntur, Araku, Srisailam).
**Done when:** `migrate deploy` + seed on a Neon dev branch; Prisma Studio shows plausible data.

## Phase 2 - Locations API ☑
`GET /locations` (geo radius, vehicle/slot/tag/open-now/available filters, distance/price/availability sort), `/:id`, `/:id/availability`. Repository pattern, indexed queries, pagination. Bbox + Haversine, no PostGIS.
**Done when:** curl returns seeded lots correctly filtered and distance-sorted from a Vizag coordinate.

## Phase 3 - Auth (Better Auth + NestJS verify) ☑
Better Auth in web, phone-OTP (stub `123456`, logs code, **throws on boot under production**), session in httpOnly cookie. NestJS `SessionGuard` verifies forwarded token; `@Roles()` + `RolesGuard` (`CITIZEN|OPERATOR|ADMIN`) wired day one.
**Done when:** phone → session in web; a guarded api route rejects anonymous, accepts a valid session.

## Phase 4 - Booking engine (correctness core) ☑
`BookingService` + state machine (transitions as data) + pure `PricingEngine` + repository. Capacity check in a **Serializable** transaction, strict inequality both bounds, serialization retry. Redis holds (TTL). Endpoints: `quote`, create, `:id`, `me`, `cancel`, `extend`.
**Done when:** N parallel attempts on the last slot → exactly one confirmation, proven by a real concurrency test.

## Phase 5 - Tickets & QR ☑
Signed, single-use, expiring tokens; QR data-URL. `verify` (check-in), `exit` (check-out + overstay). Read-and-mark-used in one tx. Operator-role routes.
**Done when:** a QR scans once to `ACTIVE`; replay → `TICKET_ALREADY_USED`.

## Phase 6 - Realtime availability ☑
Socket.IO `/realtime`, room per location. Occupancy deltas on booking/ticket events; DB snapshot on connect/reconnect so drift self-heals. Redis adapter ready for multi-instance.
**Done when:** two tabs on one location both update within a second of a booking.

## Phase 7 - Payments abstraction + worker ☑
`PaymentProvider` interface, `MockPaymentProvider`, Razorpay-shaped webhook **idempotent by `providerPaymentId`**. Success → `PENDING → CONFIRMED` + enqueues a BullMQ job (ticket issue, notification stub, invoice stub). `apps/worker` consumes with retries + DLQ.
**Done when:** a booking reaches `CONFIRMED` via a worker job; failure releases the hold.

`JOB_RUNNER=inline` is a **deployment stopgap, not a design change** - it runs the booking-confirmed work in the api process for hosts with nowhere to run a worker (Render charges for background workers). It swaps the `JobQueue` implementation and nothing else, so `JOB_RUNNER=queue` plus a deployed worker restores the intended topology with no code change. It trades away BullMQ's retries, the DLQ and the hold sweep; `TicketsService.getQr` issues a missing ticket lazily to cover the lost retry. Do not build on top of it as though it were the architecture - see [docs/DEPLOYMENT.md](DEPLOYMENT.md).

## Phase 8 - Web shell ☑
App Router, Tailwind, shadcn/ui, design tokens, Motion (reduced-motion aware), `lib/api.ts` typed on `@parkap/shared`, `lib/socket.ts`, Better Auth session, TanStack Query where needed, en/te i18n catalogs, loading/error/empty states, PWA manifest, per-route metadata + JSON-LD.
**Done when:** app boots, calls the api, renders a real seeded location, installable as a PWA.

## Phase 9 - Search & discovery ☑
Home search, results list + Google Maps view (list-only fallback without a key), filter panel, distance sort, live availability badges over socket, geolocation with manual fallback. RHF + Zod.
**Done when:** searching "Tirupati" returns seeded lots with live-updating availability.
Shipped map-first: desktop split (list beside a full-height map), mobile full-bleed map under a draggable bottom sheet, custom markers coloured by availability with the live count as their label. Google Maps was replaced by MapLibre + raster tiles, so the API key is no longer a blocker - see docs/ARCHITECTURE.md §8.

## Phase 10 - Location detail & booking flow ☑
Detail page (photos, pricing table, amenities, hours, walking time, Maps deep link) → picker → live quote → mock payment → confirmation. `SLOT_UNAVAILABLE` handled as a normal re-quote path.
**Done when:** a citizen completes search-to-confirmed-booking without touching curl.

## Phase 11 - Active ticket ☑
QR, countdown, extend with re-quote (added-interval capacity check, failure is normal), expiry warnings, directions.
**Done when:** an active booking shows a scannable QR and extends successfully.

## Phase 12 - History & profile ☑
Booking history (TanStack Table, filters), booking detail, repeat-booking pre-fill, saved vehicles, favourites, profile + locale edit.
**Done when:** past/upcoming bookings render; repeat-booking pre-fills.
Vehicles and favourites are `/vehicles` and `/favourites` in the api (docs/API-CONTRACT.md), managed on `/profile`; the booking form picks a saved vehicle with a free-text fallback for a one-off plate.

## Phase 13 - Hardening & testing ◐
Global exception filter + typed error codes, Zod on every boundary, correlation-id logging, Redis-backed rate limits. Vitest unit+integration (capacity race, QR replay, state machine, pricing, webhook idempotency), MSW component tests, Playwright happy-path + axe. `db:reset`, runbook.
**Done when:** the must-have test set passes; the api returns structured errors, never stack traces.
◐ - the must-have specs exist and pass. The DB-backed ones (capacity race, overlap boundary, QR replay, webhook idempotency) skip unless `TEST_DATABASE_URL` points at a real Postgres; CI provides one, and `setup.ts` throws rather than skipping when `CI` is set without it.

## Phase 14 - Observability & deploy ◐
Sentry (web/api/worker, SHA-tagged releases, sourcemaps), OpenTelemetry traces web→api→worker→DB, PostHog, `/health` + `/health/ready`. Multi-stage Dockerfiles, GitHub Actions CI (typecheck→lint→test→build→e2e→deploy), `migrate deploy` release step, Coolify deploy from `main`, Neon PR branches in CI.
**Done when:** the stack deploys via CI to Coolify; traces and errors land in Sentry/OTel.
◐ - Sentry/OTel bootstrap, health routes, Dockerfiles and the CI pipeline are in place. CI now publishes `parkap-api` and `parkap-worker` images to GHCR on every green push to `main`, and the release job applies migrations and pings a deploy webhook when those secrets exist, skipping cleanly when they don't. Topology, environment variables and the first-deploy checklist are written up in [docs/DEPLOYMENT.md](DEPLOYMENT.md).

Still open: no host is actually connected (`DEPLOY_WEBHOOK_URL`, `DATABASE_URL`, `DIRECT_URL` are unset), and Neon PR branches are still a local Postgres service container. A deployment today also runs `NODE_ENV=development`, because the production boot guard correctly refuses a stack whose only OTP and payment providers are the stub and the mock - so the stub OTP's fixed `123456` code is live on any URL deployed this way. Demo-safe, not citizen-safe; the fix is the real providers, not a weaker guard.

---

## End-to-end acceptance (after Phase 12)

1. `npm install && npm run db:setup` (Neon dev branch)
2. `npm run dev`
3. Sign in - any phone, OTP `123456`
4. Search Tirupati → open a lot → book 2h → mock payment → worker issues ticket → confirmed
5. Ticket page: QR + countdown; extend adds an hour and re-prices
6. `POST /tickets/verify` → `ACTIVE`; replay rejected
7. Second tab sees availability drop live
8. History lists it; repeat-booking pre-fills
9. `turbo run test` - capacity race, QR replay, state machine, pricing, webhook idempotency pass

---

## Next slices (Proposal Phase 2)

Ordered by dependency:
1. **Operator dashboard** - live stats, location CRUD, pricing, revenue. Reuses the api with `OPERATOR` role gating.
2. **Real payments** - Razorpay adapter behind `PaymentProvider`, refunds, GST invoice PDFs (worker job).
3. **Real OTP** - MSG91/Twilio behind `OtpProvider`.
4. **Staff app** - gate scanner, manual entry, offline queue. `verify`/`exit` already exist.
5. **Notifications** - Novu + React Email + Resend + FCM, all worker-driven.
6. **Passes & corporate accounts** - monthly passes, credit pools, billing.
7. **Telugu** - translate the externalised catalogs.

## Later (Proposal Phase 3)

Municipal dashboard + heatmaps, occupancy prediction, dynamic pricing, ANPR, IoT sensors, EV charging reservation, FASTag (subject to approvals). `AvailabilitySnapshot` exists from Phase 1 so prediction models have training data the day they start. Search scales to Meilisearch/Typesense when catalog size justifies it.

---

## Blocked on external input

| Need | Blocks | By |
|---|---|---|
| Neon + Upstash connection strings | Everything | Phase 0–1 |
| Better Auth secret | Auth | Phase 3 |
| ~~Google Maps API key~~ | ~~Map view~~ - resolved: MapLibre + raster tiles, no key needed | ~~Phase 9~~ |
| Razorpay merchant account | Real payments, invoices | Proposal Phase 2 |
| SMS gateway account | Real OTP | Proposal Phase 2 |
| Sentry DSN, PostHog key | Observability | Phase 14 |
| Telugu translation source | Telugu launch | Proposal Phase 2 |
