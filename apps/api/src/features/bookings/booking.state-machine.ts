import { canTransition, type BookingStatus } from '@parkap/shared';
import { DomainError } from '../../common/errors/domain-error';

/**
 * Legal transitions are declared as data in packages/shared (`BOOKING_TRANSITIONS`)
 * - this just enforces them centrally. No service assigns `booking.status`
 * directly; every change goes through this function (docs/DATA-MODEL.md).
 */
export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new DomainError('INVALID_TRANSITION', `Cannot move a booking from ${from} to ${to}`);
  }
}
