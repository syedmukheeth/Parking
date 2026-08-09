import type { CacheStore } from '../../src/common/cache/cache-store.interface';

/**
 * Deterministic, in-process CacheStore for unit/integration tests only. Never
 * selected by env in the app itself - RedisCacheStore is the only wiring in
 * dev and prod (parkap-backend skill).
 */
export class InMemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, { value: string; expiresAt: number }>();

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    await Promise.resolve();
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
    await Promise.resolve();
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const current = await this.get(key);
    const next = current ? Number(current) + 1 : 1;
    await this.set(key, String(next), current ? this.remainingTtlSeconds(key) : ttlSeconds);
    return next;
  }

  private remainingTtlSeconds(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return 0;
    return Math.max(1, Math.ceil((entry.expiresAt - Date.now()) / 1000));
  }
}
