import type { ErrorCode } from '@parkap/shared';

/**
 * Every rule violation the api throws is a DomainError with a stable `code`
 * from packages/shared. The global filter maps it to HTTP; nothing else
 * touches the response shape. Never throw a bare Error for a rule violation —
 * it would fall through to INTERNAL and leak nothing useful to the client.
 */
export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
