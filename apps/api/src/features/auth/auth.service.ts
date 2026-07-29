import { Inject, Injectable } from '@nestjs/common';
import { randomInt, randomUUID } from 'node:crypto';
import type {
  RequestOtpRequest,
  RequestOtpResponse,
  UpdateMeRequest,
  User,
  VerifyOtpRequest,
} from '@parkap/shared';
import { CACHE_STORE, type CacheStore } from '../../common/cache/cache-store.interface';
import { DomainError } from '../../common/errors/domain-error';
import { loadEnv } from '../../config/env';
import { AuthRepository } from './auth.repository';
import { OTP_PROVIDER, type OtpProvider } from './otp-provider.interface';

const OTP_TTL_SECONDS = 300;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const OTP_RATE_LIMIT_MAX_REQUESTS = 3;
const STUB_OTP_CODE = '123456';

interface OtpChallenge {
  phone: string;
  code: string;
  attempts: number;
}

/**
 * OTP challenge storage and phone verification live here, in the api, because
 * only the api touches Postgres (docs/ARCHITECTURE.md §3). apps/web calls
 * these endpoints server-side and mints the session cookie itself on success
 * — this service never issues a session token (docs/CLAUDE.md non-negotiable 7).
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(OTP_PROVIDER) private readonly otpProvider: OtpProvider,
    @Inject(CACHE_STORE) private readonly cache: CacheStore,
    private readonly authRepository: AuthRepository,
  ) {}

  async requestOtp(input: RequestOtpRequest): Promise<RequestOtpResponse> {
    const env = loadEnv();
    const attempts = await this.cache.incr(`otp:rate:${input.phone}`, OTP_RATE_LIMIT_WINDOW_SECONDS);
    if (attempts > OTP_RATE_LIMIT_MAX_REQUESTS) {
      throw new DomainError(
        'OTP_RATE_LIMITED',
        'Too many OTP requests for this phone number. Try again later.',
      );
    }

    const requestId = `otp_${randomUUID()}`;
    const code = env.OTP_PROVIDER === 'stub' ? STUB_OTP_CODE : randomInt(100_000, 999_999).toString();
    const challenge: OtpChallenge = { phone: input.phone, code, attempts: 0 };
    await this.cache.set(`otp:challenge:${requestId}`, JSON.stringify(challenge), OTP_TTL_SECONDS);

    await this.otpProvider.send(input.phone, code);

    return { requestId, expiresInSeconds: OTP_TTL_SECONDS };
  }

  /** Verifies the code and registers the phone number on first success.
   * Returns the domain User — never a token; the caller (web) mints the
   * session. */
  async verifyOtp(input: VerifyOtpRequest): Promise<User> {
    const key = `otp:challenge:${input.requestId}`;
    const raw = await this.cache.get(key);
    if (!raw) {
      throw new DomainError('OTP_INVALID', 'This OTP request has expired or does not exist');
    }

    const challenge = JSON.parse(raw) as OtpChallenge;

    if (challenge.code !== input.code) {
      const nextAttempts = challenge.attempts + 1;
      if (nextAttempts >= OTP_MAX_ATTEMPTS) {
        await this.cache.del(key);
        throw new DomainError('OTP_INVALID', 'Too many incorrect attempts; request a new code');
      }
      await this.cache.set(
        key,
        JSON.stringify({ ...challenge, attempts: nextAttempts }),
        OTP_TTL_SECONDS,
      );
      throw new DomainError('OTP_INVALID', 'Incorrect OTP code');
    }

    await this.cache.del(key);
    return this.authRepository.upsertByPhone(challenge.phone);
  }

  async getMe(userId: string): Promise<User> {
    const user = await this.authRepository.findById(userId);
    if (!user) throw new DomainError('NOT_FOUND', 'User not found');
    return user;
  }

  async updateMe(userId: string, input: UpdateMeRequest): Promise<User> {
    return this.authRepository.update(userId, input);
  }
}
