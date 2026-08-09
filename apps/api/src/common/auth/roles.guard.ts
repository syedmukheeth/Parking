import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@parkap/shared';
import { DomainError } from '../errors/domain-error';
import type { AuthenticatedRequest } from './session.guard';
import { ROLES_KEY } from './roles.decorator';

/** Always pair with SessionGuard - this only reads `request.user`, it never
 * authenticates. `@UseGuards(SessionGuard, RolesGuard)` in that order. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user || !required.includes(request.user.role)) {
      throw new DomainError('FORBIDDEN', 'You do not have permission to perform this action');
    }
    return true;
  }
}
