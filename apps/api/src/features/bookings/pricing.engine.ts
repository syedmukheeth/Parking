import type { QuoteLine } from '@parkap/shared';

/**
 * Pure domain logic, framework-free — unit-tested in isolation (parkap-architecture).
 *
 * Scoped to HOURLY billing for this MVP slice: the citizen booking flow always
 * prices a requested window off the highest-priority applicable HOURLY rule.
 * DAILY/MONTHLY rows exist in the schema for later modes (day passes, monthly
 * passes) but resolving "cheapest combination of modes" for an arbitrary
 * window is Proposal Phase 2 scope, not needed for Phase 1 acceptance
 * (docs/ROADMAP.md — scope discipline: don't build ahead of the roadmap).
 */

export interface PricingRuleLike {
  mode: string;
  baseAmount: number;
  freeMinutes: number;
  dayOfWeekMask: number | null;
  startTime: string | null;
  endTime: string | null;
  priority: number;
  validFrom: Date | null;
  validTo: Date | null;
}

export interface PriceQuote {
  amount: number;
  breakdown: QuoteLine[];
}

const MINUTES_PER_HOUR = 60;

function toHHmm(date: Date): string {
  return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
}

/** Monday = bit 0, per the schema's documented bitmask convention. */
function matchesDayOfWeek(mask: number | null, at: Date): boolean {
  if (mask === null) return true;
  const jsDay = at.getUTCDay(); // 0 = Sunday
  const mondayIndexedBit = (jsDay + 6) % 7;
  return ((mask >> mondayIndexedBit) & 1) === 1;
}

function isApplicable(rule: PricingRuleLike, at: Date): boolean {
  if (rule.validFrom && at < rule.validFrom) return false;
  if (rule.validTo && at > rule.validTo) return false;
  if (!matchesDayOfWeek(rule.dayOfWeekMask, at)) return false;
  if (rule.startTime && rule.endTime) {
    const hhmm = toHHmm(at);
    if (!(hhmm >= rule.startTime && hhmm <= rule.endTime)) return false;
  }
  return true;
}

/** Highest `priority` wins among rules applicable at the booking's start time
 * — festival/weekend pricing layers over base rates via priority alone, no
 * schema change (docs/DATA-MODEL.md). */
export function resolveHourlyRule(rules: PricingRuleLike[], at: Date): PricingRuleLike | undefined {
  return rules
    .filter((rule) => rule.mode === 'HOURLY' && isApplicable(rule, at))
    .sort((a, b) => b.priority - a.priority)[0];
}

export function quoteWindow(rules: PricingRuleLike[], startAt: Date, endAt: Date): PriceQuote {
  const rule = resolveHourlyRule(rules, startAt);
  if (!rule) {
    throw new Error('No applicable HOURLY pricing rule for this slot type and window');
  }

  const durationMinutes = Math.max(0, (endAt.getTime() - startAt.getTime()) / 60_000);
  const billableMinutes = Math.max(0, durationMinutes - rule.freeMinutes);
  const billableHours = Math.ceil(billableMinutes / MINUTES_PER_HOUR);
  const amount = billableMinutes > 0 ? billableHours * rule.baseAmount : 0;

  const breakdown: QuoteLine[] = [];
  if (rule.freeMinutes > 0 && durationMinutes > 0) {
    breakdown.push({ label: `First ${rule.freeMinutes} min free`, amount: 0 });
  }
  if (billableHours > 0) {
    breakdown.push({ label: `Hourly ×${billableHours}`, amount });
  }

  return { amount, breakdown };
}

/** Re-quotes only the added interval — an extension never re-prices the
 * original window (docs/API-CONTRACT.md). */
export function quoteExtension(
  rules: PricingRuleLike[],
  previousEndAt: Date,
  newEndAt: Date,
): PriceQuote {
  return quoteWindow(rules, previousEndAt, newEndAt);
}
