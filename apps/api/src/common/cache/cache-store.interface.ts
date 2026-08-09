/**
 * The cache seam. `RedisCacheStore` (Upstash) is the only wiring in
 * production and dev alike - no local fallback. An `InMemoryCacheStore` exists
 * only under test/ for deterministic, fast unit tests; it is never selected by
 * env (docs/ARCHITECTURE.md §6, parkap-backend skill).
 *
 * The cache only ever makes the system more conservative: it backs booking
 * holds and OTP challenges, but never authorises a booking by itself - the
 * transactional capacity check decides (docs/DATA-MODEL.md).
 */
export const CACHE_STORE = Symbol('CACHE_STORE');

export interface CacheStore {
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
  /** Atomic increment; TTL applies only the first time a key is created - the
   * shape a rate-limit counter needs. */
  incr(key: string, ttlSeconds: number): Promise<number>;
}
