import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { OTP_PROVIDER } from './otp-provider.interface';
import { StubOtpProvider } from './providers/stub-otp.provider';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    // Real MSG91/Twilio providers are a new file behind this token, selected
    // by OTP_PROVIDER - swap, not refactor (docs/ARCHITECTURE.md §6). Not
    // built in this slice (docs/ROADMAP.md, Proposal Phase 2).
    { provide: OTP_PROVIDER, useClass: StubOtpProvider },
  ],
  exports: [AuthService],
})
export class AuthModule {}
