---
name: parkap-frontend
description: Next.js 15 + React 19 frontend conventions for ParkAP web app — App Router, Server Components, Server Actions, shadcn/ui + Magic UI, Tailwind, Motion, TanStack Table, React Hook Form + Zod, accessibility (WCAG), SEO/metadata, i18n (Telugu), and Better Auth session handling. Use when building or reviewing anything in apps/web.
---

# ParkAP Frontend

Conventions for `apps/web`. Design taste comes from the global `design-taste-frontend` / `frontend-design` / `motion-system` skills — this skill covers the ParkAP-specific rules on top. Pairs with `parkap-architecture` and `../../../docs/API-CONTRACT.md`.

## Rendering model (Next 15 App Router)

- **Server Components by default.** Client Components only for interaction, browser APIs, or a socket subscription. Push `'use client'` to the leaf, not the page.
- Data reads at request time in Server Components; mutations via **Server Actions** or through `lib/api.ts`.
- Use streaming + `<Suspense>` for slow sections (map, availability) so the shell paints immediately.
- No business logic in the client. Rules live in api — the client can be bypassed. The client validates for UX; the server validates for truth.

## Feature-first structure

```
apps/web/src/features/<feature>/{components,hooks,actions.ts,api.ts,schema.ts}
apps/web/src/components/   cross-feature UI (shadcn primitives, layout)
apps/web/src/lib/          api.ts, socket.ts, session.ts, format.ts
```

## Data access

- **Every** fetch goes through `lib/api.ts` — typed against `@parkap/shared`. No bare `fetch` to the API in a component.
- Client-side server-state via TanStack Query where interactivity needs cache/refetch; Server Components fetch directly otherwise.
- Live availability via `lib/socket.ts` (Socket.IO client): subscribe on mount, unsubscribe on unmount, **replace** local state on `availability:snapshot`, merge on `availability:delta`. Cached numbers are advisory — booking outcome comes from the API response.

## UI system

- **shadcn/ui** for primitives (button, dialog, form, table shell). Copy-in components live in `src/components/ui` and are ours to edit.
- **Magic UI** for marketing/landing flourish only — not core app chrome.
- **TanStack Table** for any data grid (booking history, later operator dashboards) — headless, we own the markup.
- **React Hook Form + Zod** for every form; the Zod schema is imported from `@parkap/shared` so client and server validate identically.
- **Motion** for animation — respect `prefers-reduced-motion` (see `motion-system` skill); no animation on data-critical state changes that a screen reader must announce.

## Money, time, i18n formatting

- API returns paise (Int) and UTC ISO. **Format at the edge**: `formatINR(paise)` → `₹40.00`, `formatLocalTime(iso)` in the user's tz.
- Never do money math in the browser — display only.
- **All user-facing strings externalised** from the first component. Telugu is a launch requirement; keys in `en` and `te` message catalogs. No hardcoded English in JSX.

## Accessibility (WCAG 2.1 AA — non-negotiable)

- Semantic HTML first; ARIA only to fill gaps.
- Every interactive element keyboard-reachable with a visible focus ring.
- Contrast checked with real math (use `brand-system` skill / `ship-check`).
- Forms: label every input, associate errors via `aria-describedby`, announce async results in a live region.
- Map has a list-view equivalent — never map-only (also the no-Maps-key fallback).
- Loading, error, and **empty** states for every data view. Empty is normal in parking ("no lots nearby"), not an edge case.

## SEO & metadata

- Per-route `generateMetadata` — title, description, canonical, OpenGraph.
- Public location pages: server-rendered with `LocalBusiness`/`ParkingFacility` JSON-LD structured data.
- Semantic headings, real `<a>` for navigation, sitemap + robots.
- PWA manifest + installability (proposal requires PWA).

## Auth (Better Auth, web-owned)

- Better Auth runs in `apps/web`; session in an **httpOnly cookie**, never `localStorage`.
- `lib/session.ts` reads the session server-side; protected routes gate in a layout/middleware.
- `lib/api.ts` forwards the session token to the api, which verifies it. Web never re-implements auth logic.

## Performance

- Server Components + streaming to cut client JS.
- `next/image` for all images; lazy-load below the fold.
- Dynamic-import heavy client pieces (map, charts).
- Watch bundle size (see `cost-reducer` / `scalability` skills); no giant client component trees.

## Review rejects

- Business logic or money math in a component
- Bare `fetch` to the API instead of `lib/api.ts`
- Hardcoded user-facing string
- Missing empty/error state
- `localStorage` session token
- Map with no list fallback
- Client Component where a Server Component would do
