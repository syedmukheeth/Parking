# ParkAP

**Andhra Pradesh Smart Parking Platform**

ParkAP connects citizens, parking operators, and municipalities into one digital parking network — live availability, advance reservation, QR-gate entry, and digital payment, replacing manual tickets and cash handling.

Built by **Sampeer Studio**.

---

## Status

Phase 1 MVP — **Citizen Portal Core**. Not yet production deployed.

| Area | State |
|---|---|
| Citizen portal (search → reserve → QR → history) | In build |
| Operator dashboard | Deferred to Proposal Phase 2 |
| Municipal dashboard | Deferred to Proposal Phase 3 |
| Staff / gate app | Deferred to Proposal Phase 2 |
| Real payments (Razorpay) | Mock provider only |
| Real SMS OTP | Stub provider only (`123456`) |

See [docs/ROADMAP.md](docs/ROADMAP.md) for the phase breakdown.

---

## Quick start

Requires **Node 22+** and cloud accounts on **Neon** (Postgres) and **Upstash** (Redis) — dev runs against managed infra, no local Docker. Create a Neon dev branch and an Upstash database, paste their connection strings into `.env`.

```bash
npm install
npm run db:setup      # prisma migrate deploy + seed AP locations (Neon dev branch)
npm run dev           # web :3000, api :4000, worker attached (via turbo)
```

Open http://localhost:3000.

**Sign in:** any 10-digit phone number, OTP `123456` (stub OTP provider).

### Common scripts

| Command | What it does |
|---|---|
| `npm run dev` | API + web together |
| `npm run dev:api` | NestJS only, watch mode |
| `npm run dev:web` | Next.js only |
| `npm run db:setup` | `migrate deploy` + generate + seed (safe to re-run) |
| `npm run db:reset` | Reset the Neon dev branch and rebuild from seed |
| `npm run db:studio` | Prisma Studio data browser |
| `npm run typecheck` | Strict TS across all workspaces |
| `npm run test` | API integration tests |
| `npm run build` | Production build of both apps |

### Environment

Copy `.env.example` to `.env`. Real secrets (Neon, Upstash, Razorpay, Better Auth) go here and are gitignored.

```
DATABASE_URL="postgresql://...neon.tech/parkap?sslmode=require"   # Neon dev branch
REDIS_URL="rediss://...upstash.io:6379"                           # Upstash
BETTER_AUTH_SECRET="dev-only-change-me"
BETTER_AUTH_URL="http://localhost:3000"
AUTH_PROVIDER=stub          # stub | msg91 | twilio
PAYMENT_PROVIDER=mock       # mock | razorpay
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_MAPS_API_KEY=""  # optional; list view works without it
SENTRY_DSN=""                # optional in dev
```

The API **refuses to boot** with `AUTH_PROVIDER=stub` or `PAYMENT_PROVIDER=mock` when `NODE_ENV=production`. That guard is deliberate — do not remove it.

---

## Repository layout

```
apps/
  web/           Next.js 15 App Router — citizen portal (PWA), owns Better Auth
  api/           NestJS — REST + Socket.IO, Prisma data layer, verifies sessions
  worker/        BullMQ workers — notifications, invoices, snapshots, hold-sweeps
packages/
  shared/        Zod schemas + types shared by web, api, worker
docs/            Architecture, data model, API contract, roadmap
.claude/skills/  Project skills — enforced architecture/backend/frontend/testing/devops/domain rules
```

`packages/shared` is the contract between the two apps. Every status union, DTO, and filter shape is defined there once and imported by both sides. If a type exists in two places, that is a bug.

---

## Documentation

| Doc | Read it when |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | You need to know how the pieces fit or why a choice was made |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | You are touching the Prisma schema or a query |
| [docs/API-CONTRACT.md](docs/API-CONTRACT.md) | You are calling or building an endpoint or socket event |
| [docs/ROADMAP.md](docs/ROADMAP.md) | You want to know what is built, what is next, what is deferred |
| [CLAUDE.md](CLAUDE.md) | You are an AI agent working in this repo, or want the house rules |

---

## The two rules that matter most

1. **The capacity check is the correctness core.** Every reservation runs it inside a Serializable transaction with strict inequality on both overlap bounds; the cache never authorises a booking. Details in [docs/DATA-MODEL.md](docs/DATA-MODEL.md).
2. **Stubs live behind interfaces.** Auth, payments, and cache each have a provider interface. Swapping stub → real is a new file plus an env change, never a refactor of call sites.

---

## Tech stack

**Frontend** — Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui, Magic UI, Motion, TanStack Table, React Hook Form + Zod, Better Auth, PWA
**Backend** — NestJS, Prisma, PostgreSQL (Neon), Redis (Upstash), BullMQ, Socket.IO
**Ops** — Docker, GitHub Actions, Coolify, Sentry, OpenTelemetry, PostHog
**Testing** — Vitest, Playwright, MSW
**Planned integrations** — Razorpay, Google Maps, Novu + React Email + Resend, Firebase push

---

## License

Proprietary. © Sampeer Studio.
