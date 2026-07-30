import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import { sessionPayloadSchema, type SessionPayload } from '@parkap/shared';
import { loadEnv } from '../../config/env';
import { DomainError } from '../errors/domain-error';

export interface AuthenticatedRequest extends Request {
  user?: SessionPayload;
}

/**
 * Verifies the session token apps/web forwards on protected routes. This is
 * the only place the api trusts a session — it never issues one itself
 * (docs/CLAUDE.md non-negotiable 7, docs/ARCHITECTURE.md §6).
 */
@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new DomainError('UNAUTHENTICATED', 'Missing session token');
    }

    let decoded: unknown;
    try {
      decoded = jwt.verify(token, loadEnv().BETTER_AUTH_SECRET);
    } catch {
      throw new DomainError('UNAUTHENTICATED', 'Invalid or expired session token');
    }

    const parsed = sessionPayloadSchema.safeParse(decoded);
    if (!parsed.success) {
      throw new DomainError('UNAUTHENTICATED', 'Malformed session token');
    }

    request.user = parsed.data;
    return true;
  }
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}
