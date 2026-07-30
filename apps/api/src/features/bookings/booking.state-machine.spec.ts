import { describe, expect, it } from 'vitest';
import { DomainError } from '../../common/errors/domain-error';
import { assertTransition } from './booking.state-machine';

describe('assertTransition', () => {
  it('allows PENDING -> CONFIRMED', () => {
    expect(() => assertTransition('PENDING', 'CONFIRMED')).not.toThrow();
  });

  it('throws INVALID_TRANSITION for an illegal move', () => {
    try {
      assertTransition('COMPLETED', 'ACTIVE');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe('INVALID_TRANSITION');
    }
  });

  it('throws for any transition out of a terminal state', () => {
    for (const terminal of ['COMPLETED', 'CANCELLED', 'EXPIRED'] as const) {
      expect(() => assertTransition(terminal, 'ACTIVE')).toThrow(DomainError);
    }
  });
});
