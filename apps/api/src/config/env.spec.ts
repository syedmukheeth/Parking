import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `loadEnv` memoises, so every case re-imports the module to get a fresh
 * cache. Reaching into the cached value instead would test the test.
 */
async function freshLoadEnv() {
  vi.resetModules();
  const { loadEnv } = await import('./env');
  return loadEnv;
}

const VALID: NodeJS.ProcessEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/parkap',
  REDIS_URL: 'redis://localhost:6379',
  TICKET_TOKEN_SECRET: 'x'.repeat(32),
  BETTER_AUTH_SECRET: 'y'.repeat(32),
};

describe('loadEnv', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('port resolution', () => {
    it('falls back to the platform-assigned PORT', async () => {
      // Railway/Render/Fly/Cloud Run assign a port and route only to it. An
      // api that ignores PORT boots green and is unreachable.
      const loadEnv = await freshLoadEnv();
      expect(loadEnv({ ...VALID, PORT: '8080' }).API_PORT).toBe(8080);
    });

    it('prefers an explicit API_PORT over PORT', async () => {
      const loadEnv = await freshLoadEnv();
      expect(loadEnv({ ...VALID, API_PORT: '4000', PORT: '8080' }).API_PORT).toBe(4000);
    });

    it('defaults to 4000 when neither is set', async () => {
      const loadEnv = await freshLoadEnv();
      expect(loadEnv({ ...VALID }).API_PORT).toBe(4000);
    });
  });

  describe('the stub-provider guard', () => {
    it('refuses to boot with stub providers under production', async () => {
      const loadEnv = await freshLoadEnv();
      expect(() => loadEnv({ ...VALID, NODE_ENV: 'production' })).toThrow(/Refusing to boot/);
    });

    it('names every offending provider, not just the first', async () => {
      const loadEnv = await freshLoadEnv();
      expect(() =>
        loadEnv({ ...VALID, NODE_ENV: 'production', OTP_PROVIDER: 'stub', PAYMENT_PROVIDER: 'mock' }),
      ).toThrow(/OTP_PROVIDER=stub.*PAYMENT_PROVIDER=mock/s);
    });

    it('allows production once real providers are configured', async () => {
      const loadEnv = await freshLoadEnv();
      const env = loadEnv({
        ...VALID,
        NODE_ENV: 'production',
        OTP_PROVIDER: 'msg91',
        PAYMENT_PROVIDER: 'razorpay',
      });
      expect(env.NODE_ENV).toBe('production');
    });

    it('leaves stubs alone outside production', async () => {
      const loadEnv = await freshLoadEnv();
      expect(loadEnv({ ...VALID, NODE_ENV: 'development' }).OTP_PROVIDER).toBe('stub');
    });
  });

  it('rejects a short ticket secret rather than signing weak QR tokens', async () => {
    const loadEnv = await freshLoadEnv();
    expect(() => loadEnv({ ...VALID, TICKET_TOKEN_SECRET: 'too-short' })).toThrow(
      /at least 32 characters/,
    );
  });

  it('parses CORS origins as a trimmed list', async () => {
    const loadEnv = await freshLoadEnv();
    const env = loadEnv({ ...VALID, API_CORS_ORIGINS: 'https://a.com, https://b.com' });
    expect(env.API_CORS_ORIGINS).toEqual(['https://a.com', 'https://b.com']);
  });
});
