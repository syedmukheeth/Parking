---
name: parkap-testing
description: Testing conventions for ParkAP — Vitest unit/integration, Playwright E2E, MSW for network mocking, and what MUST be tested (capacity race, QR replay, state-machine transitions, pricing). Use when writing tests, adding a feature that needs coverage, setting up test infra, or reviewing test quality.
---

# ParkAP Testing

Pairs with `parkap-backend` and `parkap-frontend`. Test the behaviour that breaks money or capacity, not line coverage for its own sake.

## Tools

- **Vitest** — unit + integration, both apps and `packages/shared`.
- **Playwright** — end-to-end citizen flows in a real browser.
- **MSW** — mock the api at the network layer in web tests and Storybook, so components are tested against the real contract shapes from `@parkap/shared`.

## The test pyramid for ParkAP

| Layer | Runs against | Covers |
|---|---|---|
| Unit | pure functions | pricing engine, capacity math, state-machine transitions, formatters |
| Integration (api) | a real test Postgres | repositories, transactions, the capacity race, webhook idempotency |
| Component (web) | MSW-mocked api | forms, availability badges, empty/error states |
| E2E (Playwright) | full stack | search → book → pay(mock) → QR → extend → history |

## Must-have tests (these guard the non-negotiables)

1. **Capacity race** — spawn N parallel `POST /bookings` on the last slot; assert exactly one `CONFIRMED`, the rest `SLOT_UNAVAILABLE`. This is the single most important test in the repo.
2. **QR replay** — verify a ticket once → `ACTIVE`; verify again → `TICKET_ALREADY_USED`. Expired token → `TICKET_EXPIRED`.
3. **State machine** — every illegal transition throws `INVALID_TRANSITION`; every legal one succeeds. Table-driven.
4. **Pricing** — hourly/daily boundaries, free-minutes grace, priority resolution, extend re-price of the added interval only.
5. **Overlap boundary** — a booking ending at 14:00 does not conflict with one starting at 14:00 (guards the strict-inequality rule).
6. **Webhook idempotency** — same `providerPaymentId` delivered twice issues one ticket.
7. **Money** — no float anywhere; paise in, paise out; `formatINR` rounding.

## Integration DB

- Run against a real Postgres (a separate Neon branch or a local test DB), not a mock — transactions and serialization behaviour are exactly what we're testing and a mock hides them.
- Each test file: migrate + truncate/seed a known fixture, run, roll back or truncate after. Isolated, order-independent.
- Never point tests at the dev or prod database.

## E2E (Playwright)

- One happy-path spec covering the full acceptance run (search Tirupati → confirmed booking → QR → extend → history).
- Stub OTP `123456` and mock payment make this deterministic — no external accounts needed in CI.
- Test the a11y basics: keyboard-only booking, focus order, labels (Playwright + axe).

## Conventions

- Test file next to source: `*.spec.ts`. E2E in `apps/web/e2e/`.
- Arrange-Act-Assert; one behaviour per test; descriptive names (`rejects second booking on last slot`).
- No sleeps — await conditions/events.
- Deterministic time: inject a clock, never assert on `Date.now()` directly.
- Fixtures use realistic AP data, same as the seed.

## CI gate (GitHub Actions)

`typecheck → lint → unit+integration → build → e2e`. A red capacity-race or QR-replay test blocks merge. Coverage is reported, not worshipped — the must-have list above is the real gate.
