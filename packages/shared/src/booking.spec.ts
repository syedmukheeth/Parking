import { describe, expect, it } from 'vitest';
import { BOOKING_STATUS, type BookingStatus } from './enums';
import { BOOKING_TRANSITIONS, canTransition } from './booking';

/**
 * Table-driven: every legal transition succeeds, every illegal one throws
 * (via the api's assertTransition, which wraps canTransition) — this is one
 * of the must-have tests in the repo (parkap-testing skill).
 */
describe('booking state machine', () => {
  const legalPairs: Array<[BookingStatus, BookingStatus]> = Object.entries(BOOKING_TRANSITIONS).flatMap(
    ([from, tos]) => tos.map((to) => [from as BookingStatus, to] as [BookingStatus, BookingStatus]),
  );

  it.each(legalPairs)('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it('rejects every pair not declared as legal', () => {
    const legalSet = new Set(legalPairs.map(([from, to]) => `${from}->${to}`));
    for (const from of BOOKING_STATUS) {
      for (const to of BOOKING_STATUS) {
        if (from === to) continue;
        const isLegal = legalSet.has(`${from}->${to}`);
        expect(canTransition(from, to)).toBe(isLegal);
      }
    }
  });

  it('has no transitions out of terminal states', () => {
    for (const terminal of ['COMPLETED', 'CANCELLED', 'EXPIRED'] as const) {
      expect(BOOKING_TRANSITIONS[terminal]).toEqual([]);
    }
  });
});
