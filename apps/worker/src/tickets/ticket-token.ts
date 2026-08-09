import { createHmac, randomBytes } from 'node:crypto';

/**
 * Duplicated from apps/api/src/features/tickets/ticket-token.ts rather than
 * imported - apps/api and apps/worker are independently deployed processes
 * with no shared server-only package, and this ~10-line pure crypto function
 * doesn't justify introducing one for this MVP slice. TICKET_TOKEN_SECRET
 * must be identical in both apps' env for tokens to verify across them.
 */
export function generateTicketToken(bookingId: string, secret: string): string {
  const nonce = randomBytes(16).toString('base64url');
  const payload = `${bookingId}.${nonce}`;
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
