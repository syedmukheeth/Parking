import { Injectable, Logger } from '@nestjs/common';
import type { OtpProvider } from '../otp-provider.interface';

/**
 * Logs the code to the API console; never sends a real SMS. The boot guard in
 * config/env.ts refuses to start this under NODE_ENV=production — shipping it
 * would be a complete authentication bypass (docs/CLAUDE.md non-negotiable 4).
 */
@Injectable()
export class StubOtpProvider implements OtpProvider {
  private readonly logger = new Logger('StubOtpProvider');

  async send(phone: string, code: string): Promise<void> {
    this.logger.log(`OTP for ${phone}: ${code}`);
    await Promise.resolve();
  }
}
