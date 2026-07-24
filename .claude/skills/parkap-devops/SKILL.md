---
name: parkap-devops
description: DevOps, deployment, observability, and Git workflow for ParkAP — Neon Postgres, Upstash Redis, Docker, GitHub Actions CI/CD, Coolify deploy, env validation, Sentry + OpenTelemetry, logging, and commit/branch/PR conventions. Use when touching infra, CI, deployment, env config, monitoring, or defining Git process.
---

# ParkAP DevOps

Infrastructure, delivery, and process. Cost discipline: see the global `cost-reducer` skill; scale: `scalability`.

## Environments & managed infra

No Docker on the dev machine — dev uses **managed cloud infra**, so dev and prod share provider behaviour:

| Service | Dev | Prod |
|---|---|---|
| Postgres | Neon (dev branch) | Neon (main branch) |
| Redis | Upstash | Upstash |
| App hosting | local `npm run dev` | Coolify (self-hosted PaaS) or Dokploy |

Neon branching gives each developer/PR an isolated Postgres branch — use a PR branch DB in CI, never the shared dev DB.

## Environment variables

- Single **Zod-validated** env schema per app, checked at boot; invalid/missing config crashes immediately, never runs degraded.
- `.env.example` committed and complete; real `.env` gitignored.
- Secrets (Neon URL, Upstash token, Razorpay keys, Better Auth secret, Sentry DSN, Resend/Novu/FCM keys) never in git — injected via Coolify/host secrets.
- The stub→real provider switches (`AUTH_PROVIDER`, `PAYMENT_PROVIDER`, `CACHE_DRIVER`) are env-driven; production must set real values and the API boot-guard enforces it.

## Docker (for deploy, not dev)

- Multi-stage Dockerfile per app (`web`, `api`, `worker`): build stage installs+builds, runtime stage copies artifacts + `prisma generate` output, runs as non-root, minimal base.
- `docker-compose.yml` describes the prod-like topology for Coolify; local dev stays native against Neon/Upstash.
- Run `prisma migrate deploy` as a release step before the app starts, never `migrate dev` in prod.

## CI/CD (GitHub Actions)

Pipeline on every PR:

```
install → typecheck → lint → test (unit+integration on a Neon PR branch) → build → e2e (Playwright) → [main only] docker build + deploy to Coolify
```

- Cache node_modules / turbo.
- Migrations checked into the PR; CI runs `migrate deploy` against the PR's Neon branch and fails on drift.
- Deploy only from `main`, only after green.

## Observability

- **Sentry** in web, api, worker — errors + performance traces, releases tagged with the git SHA, source maps uploaded.
- **OpenTelemetry** — distributed traces spanning web → api → worker → DB; propagate the correlation id used in logs.
- **Structured JSON logs** with request/correlation id, user id (never PII beyond id), and level. No `console.log` in shipped code.
- Health endpoints: `/health` (liveness) and `/health/ready` (DB + Redis reachable) for the platform's checks.
- Product analytics via PostHog (client + server) — separate from error monitoring.

## Git workflow

- **Trunk-based-ish**: short-lived branches off `main`, small PRs, merge fast.
- Branch names: `feat/bookings-extend`, `fix/overlap-boundary`, `chore/ci-cache`, `docs/api-contract`.
- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `perf:`. Subject ≤ ~50 chars, imperative. Body explains *why* when non-obvious. (The `caveman-commit` skill and `commit-commands` plugin help.)
- Never commit secrets, `dev.db`, `.env`, or generated Prisma client.
- Never `--no-verify` or skip hooks unless the user asks.
- Commit/push only when the user asks; branch first if on `main`.

## PR checklist (enforce in review)

- [ ] Types pass, lint clean, tests green (incl. capacity-race + QR-replay if touched)
- [ ] New boundary validated with a `@parkap/shared` Zod schema
- [ ] No Prisma outside a repository; no business logic in controller/component
- [ ] Money in paise, times UTC, strings externalised
- [ ] Migration committed if the schema changed
- [ ] No secret, no `console.log`, no `localStorage` token
- [ ] Loading/error/empty states for new UI; a11y checked
- [ ] Roadmap-appropriate (not building ahead of the current phase)

Use the `code-review` and `pr-review-toolkit` plugins to run the mechanical part; this checklist covers the ParkAP-specific part.
