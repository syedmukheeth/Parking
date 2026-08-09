import 'server-only';
import type { ErrorResponse } from '@parkap/shared';
import { getEffectiveToken } from './session';

/**
 * The only place apps/web calls the api. Every feature's `api.ts` goes
 * through this - no bare `fetch` to the api in a component or action
 * (parkap-frontend skill).
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Forward the session cookie as a bearer token. Default true. Pass false
   * only for the OTP request/verify calls that precede a session existing. */
  auth?: boolean;
  /**
   * Seconds to keep the response in Next's Data Cache, shared across requests
   * and visitors. Off by default: every read stays live unless a caller opts
   * in.
   *
   * Only legal on an unauthenticated GET, and enforced below rather than left
   * to reviewer discipline. A cached authenticated response would be served to
   * the next visitor, which is an account data leak, not a stale page.
   */
  revalidateSeconds?: number;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, revalidateSeconds } = options;

  if (revalidateSeconds !== undefined && (auth || method !== 'GET')) {
    throw new Error(
      `apiFetch: revalidateSeconds is only valid on an unauthenticated GET (${method} ${path}). ` +
        'Caching a response tied to a session would serve one citizen their data and the next citizen the same copy.',
    );
  }

  const url = new URL(path, API_BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getEffectiveToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...(revalidateSeconds === undefined
      ? { cache: 'no-store' as const }
      : { next: { revalidate: revalidateSeconds } }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ErrorResponse | null;
    const error = payload?.error;
    throw new ApiError(
      error?.code ?? 'INTERNAL',
      error?.message ?? response.statusText,
      response.status,
      error?.details,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
