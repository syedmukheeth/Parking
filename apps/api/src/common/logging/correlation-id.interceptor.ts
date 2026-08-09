import { type CallHandler, type ExecutionContext, Injectable, Logger, type NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { tap } from 'rxjs';

interface RequestWithCorrelation extends Request {
  correlationId?: string;
}

/**
 * Structured JSON access logs with a correlation id that propagates to jobs
 * and error logs. No `console.log` in shipped code - this is the one place
 * that logs the request lifecycle.
 */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger('http');

  intercept(context: ExecutionContext, next: CallHandler): ReturnType<CallHandler['handle']> {
    const req = context.switchToHttp().getRequest<RequestWithCorrelation>();
    const res = context.switchToHttp().getResponse<Response>();
    const correlationId = (req.headers['x-correlation-id'] as string | undefined) ?? randomUUID();
    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    const startedAt = Date.now();
    const logAccess = (): void => {
      this.logger.log(
        JSON.stringify({
          correlationId,
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          durationMs: Date.now() - startedAt,
        }),
      );
    };

    return next.handle().pipe(tap({ next: logAccess, error: logAccess }));
  }
}
