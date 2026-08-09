import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import { sessionPayloadSchema, type SessionPayload } from '@parkap/shared';
import { loadServerEnv } from '@/config/server-env';

/**
 * apps/web owns the session. It lives in an httpOnly cookie, never
 * localStorage, an XSS on a page holding a token in localStorage is an
 * account takeover (docs/CLAUDE.md non-negotiable 7).
 */
export const SESSION_COOKIE_NAME = 'parkap_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, loadServerEnv().BETTER_AUTH_SECRET, { expiresIn: SESSION_TTL_SECONDS });
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * ─────────────────────── DEMO MODE ───────────────────────
 *
 * When DEMO_AUTO_SIGN_IN is on, the app skips the sign-in screen entirely and
 * runs as one fixed demo citizen, so the whole product can be clicked through
 * without an account. It signs that citizen in through the *real* OTP endpoints
 * (the same stub flow a human would use), so the api still issues a genuine
 * session and every authorisation check downstream behaves normally.
 *
 * SECURITY: this is a total authentication bypass. It refuses to run when
 * NODE_ENV is production, in the same spirit as the stub-provider boot guard in
 * apps/api. Do not weaken that check, and do not enable the flag on a
 * deployed environment.
 */
/**
 * Matches the demo row created by apps/api/prisma/seed.ts. The token is signed
 * locally rather than obtained through the OTP endpoints: those are rate
 * limited per phone number, so a handful of server restarts would lock the
 * demo out of its own app.
 */
const DEMO_SESSION: SessionPayload = {
  sub: 'usr_demo_citizen',
  phone: '+919000000001',
  role: 'CITIZEN',
};

function demoModeEnabled(): boolean {
  return process.env.DEMO_AUTO_SIGN_IN === 'true' && process.env.NODE_ENV !== 'production';
}

/** Signed once per server process rather than on every render. */
let demoToken: string | null = null;

function getDemoToken(): string | null {
  if (!demoModeEnabled()) return null;
  demoToken ??= signSessionToken(DEMO_SESSION);
  return demoToken;
}

/** Reads and verifies the current session server-side. Returns null rather
 * than throwing: an absent or expired session is a normal, common state. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = (await getSessionToken()) ?? getDemoToken();
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, loadServerEnv().BETTER_AUTH_SECRET);
    const parsed = sessionPayloadSchema.safeParse(decoded);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The token outgoing api calls should carry: the citizen's own cookie, or the
 * demo session when demo mode is on. */
export async function getEffectiveToken(): Promise<string | null> {
  return (await getSessionToken()) ?? getDemoToken();
}

export function isDemoMode(): boolean {
  return demoModeEnabled();
}

/** For pages that require a signed-in citizen. Search, location detail, and the
 * home page stay public and never call this (parkap-frontend skill). */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  return session;
}
