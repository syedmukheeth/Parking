import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { ERROR_HTTP_STATUS, type ErrorCode } from '@parkap/shared';
import { DomainError } from '../errors/domain-error';

/**
 * Maps every thrown error to the stable envelope in docs/API-CONTRACT.md.
 * Never returns a stack trace — unhandled errors log server-side and return a
 * correlation id the client can hand back to support.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ correlationId?: string }>();

    if (exception instanceof DomainError) {
      response.status(ERROR_HTTP_STATUS[exception.code]).json({
        error: { code: exception.code, message: exception.message, details: exception.details },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = httpStatusToErrorCode(status);
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);
      response.status(status).json({
        error: {
          code,
          message: Array.isArray(message) ? message.join('; ') : message,
        },
      });
      return;
    }

    const requestId = request.correlationId ?? randomUUID();
    this.logger.error(
      `Unhandled exception [${requestId}]`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(500).json({
      error: { code: 'INTERNAL', message: 'An unexpected error occurred', details: { requestId } },
    });
  }
}

function httpStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return 'VALIDATION_FAILED';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'INTERNAL';
  }
}
