/**
 * Shared by every feature's Server Actions (booking, tickets, profile, …) —
 * moved up to lib/ once a second feature needed it, per the feature-first
 * convention (parkap-frontend skill).
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };
