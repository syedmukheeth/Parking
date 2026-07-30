import { describe, expect, it } from 'vitest';
import { quoteExtension, quoteWindow, resolveHourlyRule, type PricingRuleLike } from './pricing.engine';

function hourlyRule(overrides: Partial<PricingRuleLike> = {}): PricingRuleLike {
  return {
    mode: 'HOURLY',
    baseAmount: 2000,
    freeMinutes: 15,
    dayOfWeekMask: null,
    startTime: null,
    endTime: null,
    priority: 0,
    validFrom: null,
    validTo: null,
    ...overrides,
  };
}

describe('quoteWindow', () => {
  it('bills whole hours, rounding up', () => {
    const start = new Date('2026-07-24T09:00:00.000Z');
    const end = new Date('2026-07-24T11:30:00.000Z'); // 2h30m raw, 15m free -> 2h15m billable -> 3h
    const { amount, breakdown } = quoteWindow([hourlyRule()], start, end);

    expect(amount).toBe(3 * 2000);
    expect(breakdown).toEqual([
      { label: 'First 15 min free', amount: 0 },
      { label: 'Hourly ×3', amount: 6000 },
    ]);
  });

  it('charges nothing when the whole booking fits in the free window', () => {
    const start = new Date('2026-07-24T09:00:00.000Z');
    const end = new Date('2026-07-24T09:10:00.000Z'); // 10 minutes, 15 free
    const { amount, breakdown } = quoteWindow([hourlyRule()], start, end);

    expect(amount).toBe(0);
    expect(breakdown).toEqual([{ label: 'First 15 min free', amount: 0 }]);
  });

  it('picks the highest-priority applicable rule — festival pricing layers over base', () => {
    const base = hourlyRule({ baseAmount: 2000, priority: 0 });
    const festival = hourlyRule({ baseAmount: 5000, priority: 10 });
    const start = new Date('2026-07-24T09:00:00.000Z');
    const end = new Date('2026-07-24T10:00:00.000Z');

    const { amount } = quoteWindow([base, festival], start, end);
    expect(amount).toBe(5000 * 1); // 45 billable minutes -> ceil to 1 hour, at festival rate
  });

  it('throws when no applicable HOURLY rule exists', () => {
    expect(() => quoteWindow([], new Date(), new Date(Date.now() + 3_600_000))).toThrow();
  });
});

describe('resolveHourlyRule', () => {
  it('ignores rules outside their validFrom/validTo window', () => {
    const rule = hourlyRule({
      priority: 10,
      validFrom: new Date('2026-01-01T00:00:00Z'),
      validTo: new Date('2026-01-31T23:59:59Z'),
    });
    const outOfWindow = resolveHourlyRule([rule], new Date('2026-07-24T09:00:00Z'));
    expect(outOfWindow).toBeUndefined();
  });

  it('ignores rules outside their dayOfWeekMask (Monday = bit 0)', () => {
    // Friday 2026-07-24 is JS day 5 -> Monday-indexed bit 4.
    const mondayOnly = hourlyRule({ dayOfWeekMask: 0b0000001 });
    expect(resolveHourlyRule([mondayOnly], new Date('2026-07-24T09:00:00Z'))).toBeUndefined();

    const fridayIncluded = hourlyRule({ dayOfWeekMask: 0b0010000 });
    expect(resolveHourlyRule([fridayIncluded], new Date('2026-07-24T09:00:00Z'))).toBeDefined();
  });
});

describe('quoteExtension', () => {
  it('prices only the added interval, not the original window', () => {
    const previousEndAt = new Date('2026-07-24T11:00:00.000Z');
    const newEndAt = new Date('2026-07-24T12:00:00.000Z');
    const { amount } = quoteExtension([hourlyRule({ freeMinutes: 0 })], previousEndAt, newEndAt);
    expect(amount).toBe(2000); // exactly 1 added hour, no free-minutes double-dip
  });
});
