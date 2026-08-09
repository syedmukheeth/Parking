import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Signed, single-use, expiring token (docs/DATA-MODEL.md). The signature lets
 * a malformed/tampered token be rejected before touching the database; the
 * authoritative single-use check is still the `Ticket.usedAt` column, read
 * and set in one transaction (`TicketsService.verify`).
 *
 * NOTE: apps/worker duplicates this file (`apps/worker/src/tickets/ticket-token.ts`)
 * rather than importing it - the two apps are independently deployed
 * processes with no shared server-only package, and a ~20-line pure crypto
 * function doesn't justify introducing one for this MVP slice.
 */
export function generateTicketToken(bookingId: string, secret: string): string {
  const nonce = randomBytes(16).toString('base64url');
  const payload = `${bookingId}.${nonce}`;
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyTicketTokenSignature(token: string, secret: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [bookingId, nonce, signature] = parts;
  // `noUncheckedIndexedAccess` means destructuring can't be narrowed by the
  // length check above - this makes the tuple's shape explicit rather than
  // asserting past it.
  if (bookingId === undefined || nonce === undefined || signature === undefined) return false;
  const expected = createHmac('sha256', secret).update(`${bookingId}.${nonce}`).digest('base64url');

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}
