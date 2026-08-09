import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { generateTicketToken } from './ticket-token';

const SECRET = 'worker-spec-secret-not-used-in-prod';

/**
 * This file is a deliberate duplicate of apps/api's ticket-token.ts (see the
 * comment there). The risk that duplication carries is drift: a token the
 * worker issues must still verify under the api's `verifyTicketTokenSignature`.
 * These specs pin the wire format from the worker's side without importing
 * across the app boundary - the signature is recomputed independently here, so
 * a change to either implementation breaks this test rather than production.
 */
describe('generateTicketToken', () => {
  it('emits bookingId.nonce.signature', () => {
    const parts = generateTicketToken('bkg_123', SECRET).split('.');

    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('bkg_123');
    expect(parts[1]).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(parts[2]).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('signs the bookingId.nonce payload with HMAC-SHA256, base64url', () => {
    const [bookingId, nonce, signature] = generateTicketToken('bkg_123', SECRET).split('.');
    const expected = createHmac('sha256', SECRET).update(`${bookingId}.${nonce}`).digest('base64url');

    expect(signature).toBe(expected);
  });

  it('produces a different signature under a different secret', () => {
    const [bookingId, nonce, signature] = generateTicketToken('bkg_123', SECRET).split('.');
    const other = createHmac('sha256', 'a-different-secret').update(`${bookingId}.${nonce}`).digest('base64url');

    expect(signature).not.toBe(other);
  });

  it('never repeats a nonce for the same booking', () => {
    const nonces = new Set(
      Array.from({ length: 200 }, () => generateTicketToken('bkg_123', SECRET).split('.')[1]),
    );

    expect(nonces.size).toBe(200);
  });
});
