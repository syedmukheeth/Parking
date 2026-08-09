import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { SessionPayload } from '@parkap/shared';
import type { AuthenticatedRequest } from './session.guard';

/** Only valid behind SessionGuard - that guard is what populates `request.user`. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionPayload => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user as SessionPayload;
});
