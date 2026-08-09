# Deployment

How ParkAP is deployed, and why the topology is what it is.

Related: [ARCHITECTURE.md](ARCHITECTURE.md) · [ROADMAP.md](ROADMAP.md) · [DATA-MODEL.md](DATA-MODEL.md)

---

## Topology

| App | Host | Why |
|---|---|---|
| `apps/web` | Vercel | Next.js 15 App Router. Vercel is the native target. |
| `apps/api` | Container host (Railway · Render · Fly · Coolify) | Holds Socket.IO connections and needs a long-lived process. |
| `apps/worker` | Same container host, separate service | BullMQ consumer. Runs continuously, serves no HTTP. |
| Postgres | Neon | |
| Redis | Upstash | |

### Why the api cannot go on Vercel

This is written down because it has already been tried once, and the failure
mode (`FUNCTION_INVOCATION_FAILED`, no useful message) does not point at the
cause.

1. **`main.ts` binds a port.** A serverless function must export a request
   handler. A process that calls `app.listen()` and never returns is invoked
   once and killed.
2. **Socket.IO cannot live in a serverless function.** `RealtimeGateway` holds
   open connections. Functions are killed between requests, so live
   availability would silently never arrive — the UI would look fine and be
   wrong, which is worse than an error.
3. **The worker has nowhere to run.** `PENDING → CONFIRMED` happens in a
   BullMQ job. With no worker, every booking stalls at `PENDING` and every
   hold expires.

Vercel hosts `apps/web`. It does not host `apps/api`.

---

## Environment variables

Every value is validated by Zod at boot and the app refuses to start on a bad
one. See `.env.example` for the full annotated list; this is the deployment
subset.

### `apps/api` service

| Variable | Notes |
|---|---|
| `NODE_ENV` | See [the stub-provider guard](#the-stub-provider-guard) below. Not baked into the image. |
| `DATABASE_URL` | Neon **pooled** connection string. |
| `DIRECT_URL` | Neon **unpooled**. Used by `prisma migrate`, not by the running app. |
| `REDIS_URL` | Upstash. `rediss://` — TLS. |
| `API_CORS_ORIGINS` | Must include the deployed web origin, e.g. `https://parkap.vercel.app`. Comma-separated. Getting this wrong shows as every api call failing from the browser and working from curl. |
| `TICKET_TOKEN_SECRET` | ≥32 chars. **Must be byte-identical to the worker's.** The api signs QR tokens, the worker verifies them. |
| `BETTER_AUTH_SECRET` | ≥32 chars. Must match the web app's. |
| `BOOKING_HOLD_TTL_MINUTES` | Optional, defaults to 10. |
| `SENTRY_DSN` | Optional. No-ops when unset. |

`API_PORT` is **not** set by hand on a container host. Railway, Render, Fly and
Cloud Run inject `PORT`; `loadEnv()` reads that when `API_PORT` is absent.

### `apps/worker` service

`NODE_ENV`, `DATABASE_URL`, `REDIS_URL`, `TICKET_TOKEN_SECRET` (identical to
the api's), `WORKER_CONCURRENCY` (optional, defaults to 5), `SENTRY_DSN`.

### `apps/web` (Vercel project settings)

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<api-host>` — no trailing slash. |
| `NEXT_PUBLIC_SOCKET_URL` | Same origin as the api. |
| `BETTER_AUTH_SECRET` | Matches the api's. |
| `BETTER_AUTH_URL` | The deployed web origin. |
| `DEMO_AUTO_SIGN_IN` | `true` only for a stakeholder demo. Inert under `NODE_ENV=production`. |

`NEXT_PUBLIC_*` values are inlined at **build** time. Changing one requires a
redeploy, not a restart.

---

## The stub-provider guard

`apps/api/src/config/env.ts` throws on boot when `NODE_ENV=production` while
`OTP_PROVIDER=stub` or `PAYMENT_PROVIDER=mock`. Only the stub and mock
implementations exist today — `msg91`, `twilio` and `razorpay` are accepted
enum values with no provider behind them yet (Proposal Phase 2 in
[ROADMAP.md](ROADMAP.md)).

So a deployment today runs with `NODE_ENV=development`, and that carries a real
consequence stated plainly: **the stub OTP provider accepts `123456` for every
phone number.** Anyone who knows the URL can sign in as anyone. That is
acceptable for a stakeholder demo on an unadvertised URL. It is not acceptable
for real citizens, and the guard is what stops it from quietly becoming the
production configuration.

Do not "fix" a failed production deploy by relaxing the guard. The fix is to
implement the real providers.

---

## Release steps

Migrations are a release step, run **before** the new containers start. Never
`migrate dev` against a deployed database ([DATA-MODEL.md](DATA-MODEL.md)).

```bash
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

`DIRECT_URL` must be set for that command — Neon's pooled endpoint cannot run
migrations.

Seeding is separate and manual. It is idempotent, but it is not part of a
release:

```bash
npm run db:seed
```

### Images

CI builds and pushes `ghcr.io/<owner>/parkap-api` and `parkap-worker` on every
green push to `main` (`.github/workflows/ci.yml`). Point the container host at
those tags, or let the host build from the Dockerfiles directly — both work,
the images just make deploys faster and reproducible.

Build locally with the repo root as context; npm workspaces need the whole tree
to resolve `@parkap/shared`:

```bash
docker build -f apps/api/Dockerfile -t parkap-api .
```

---

## Health checks

`GET /health` — liveness, no dependencies touched.
`GET /health/ready` — readiness, checks Postgres and Redis.

Point the platform's health check at `/health`. Using `/health/ready` for
liveness means a brief Redis blip restarts a healthy container.

---

## First-deploy checklist

1. Neon database created, migrations applied, seed run.
2. Upstash Redis created.
3. Api service deployed. `curl https://<api-host>/health` returns 200.
4. Worker service deployed, sharing `TICKET_TOKEN_SECRET` with the api.
5. `API_CORS_ORIGINS` includes the web origin.
6. Web deployed to Vercel with `NEXT_PUBLIC_API_URL` pointing at the api.
7. Search returns seeded lots in the browser, and a booking reaches
   `CONFIRMED` — which proves the worker is actually consuming.
