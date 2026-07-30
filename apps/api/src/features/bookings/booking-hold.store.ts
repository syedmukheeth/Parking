import { Inject, Injectable } from '@nestjs/common';
import { CACHE_STORE, type CacheStore } from '../../common/cache/cache-store.interface';

/**
 * The short-TTL cache hold from docs/ARCHITECTURE.md §4 — advisory only. The
 * actual double-booking guard is the Serializable Postgres transaction in
 * BookingRepository.countOverlapping, which counts unexpired PENDING rows
 * directly (see the comment there for why). This store exists so realtime and
 * the UI can show "just taken" instantly, without waiting on a DB round-trip,
 * and so a hold naturally requires no cleanup job — TTL does the work.
 */
@Injectable()
export class BookingHoldStore {
  constructor(@Inject(CACHE_STORE) private readonly cache: CacheStore) {}

  async acquire(bookingId: string, slotTypeId: string, ttlMinutes: number): Promise<void> {
    await this.cache.set(`hold:${bookingId}`, slotTypeId, ttlMinutes * 60);
  }

  async release(bookingId: string): Promise<void> {
    await this.cache.del(`hold:${bookingId}`);
  }
}
