import { z } from 'zod';

/**
 * Stable machine-readable error codes. Clients branch on `code`; `message` is
 * human-readable and may change. Mirrors the table in docs/API-CONTRACT.md.
 */
export const ERROR_CODE = [
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'OTP_INVALID',
  'OTP_RATE_LIMITED',
  'SLOT_UNAVAILABLE',
  'HOLD_EXPIRED',
  'INVALID_TRANSITION',
  'TICKET_ALREADY_USED',
  'TICKET_EXPIRED',
  'PAYMENT_FAILED',
  'RATE_LIMITED',
  'INTERNAL',
] as const;
export type ErrorCode = (typeof ERROR_CODE)[number];
export const errorCodeSchema = z.enum(ERROR_CODE);

/** HTTP status each code maps to. The global exception filter reads this. */
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  OTP_INVALID: 400,
  OTP_RATE_LIMITED: 429,
  SLOT_UNAVAILABLE: 409,
  HOLD_EXPIRED: 409,
  INVALID_TRANSITION: 409,
  TICKET_ALREADY_USED: 409,
  TICKET_EXPIRED: 409,
  PAYMENT_FAILED: 402,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export const errorResponseSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
