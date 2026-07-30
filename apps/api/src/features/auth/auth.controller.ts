import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import {
  type RequestOtpRequest,
  requestOtpRequestSchema,
  type RequestOtpResponse,
  type SessionPayload,
  type UpdateMeRequest,
  updateMeRequestSchema,
  type User,
  type VerifyOtpRequest,
  verifyOtpRequestSchema,
} from '@parkap/shared';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { SessionGuard } from '../../common/auth/session.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';

/**
 * `otp/request` and `otp/verify` are called server-side by apps/web's session
 * layer, which mints the session cookie on success — this controller never
 * issues one. `/me` is a normal SessionGuard-protected business route.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  requestOtp(
    @Body(new ZodValidationPipe(requestOtpRequestSchema)) body: RequestOtpRequest,
  ): Promise<RequestOtpResponse> {
    return this.authService.requestOtp(body);
  }

  @Post('otp/verify')
  verifyOtp(
    @Body(new ZodValidationPipe(verifyOtpRequestSchema)) body: VerifyOtpRequest,
  ): Promise<User> {
    return this.authService.verifyOtp(body);
  }

  @UseGuards(SessionGuard)
  @Get('me')
  me(@CurrentUser() user: SessionPayload): Promise<User> {
    return this.authService.getMe(user.sub);
  }

  @UseGuards(SessionGuard)
  @Patch('me')
  updateMe(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(updateMeRequestSchema)) body: UpdateMeRequest,
  ): Promise<User> {
    return this.authService.updateMe(user.sub, body);
  }
}
