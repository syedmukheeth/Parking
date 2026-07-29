import { Global, Module } from '@nestjs/common';
import { loadEnv } from '../../config/env';
import { CACHE_STORE } from './cache-store.interface';
import { RedisCacheStore } from './redis-cache.store';

@Global()
@Module({
  providers: [
    {
      provide: RedisCacheStore,
      useFactory: () => new RedisCacheStore(loadEnv().REDIS_URL),
    },
    // Feature code depends on the CacheStore interface via this token
    // (parkap-architecture SOLID §D); the health check depends on the
    // concrete class to reach `ping()`. Same singleton instance either way.
    { provide: CACHE_STORE, useExisting: RedisCacheStore },
  ],
  exports: [CACHE_STORE, RedisCacheStore],
})
export class CacheModule {}
