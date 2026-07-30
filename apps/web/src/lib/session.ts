import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import { sessionPayloadSchema, type SessionPayload } from '@parkap/shared';
import { loadServerEnv } from '@/config/server-env';

/**
 * apps/web owns the session. It lives in an httpOnly cookie, never
 * localStorage — an XSS on a page holding a token in localStorage is an
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

/** Reads and verifies the current session server-side. Returns null rather
 * than throwing — an absent or expired session is a normal, common state. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, loadServerEnv().BETTER_AUTH_SECRET);
    const parsed = sessionPayloadSchema.safeParse(decoded);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** For pages that require a signed-in citizen — search, location detail, and
 * the home page stay public and never call this (parkap-frontend skill). */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  return session;
}
