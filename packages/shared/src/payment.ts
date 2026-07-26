import { z } from 'zod';
import { paymentStatusSchema } from './enums';
import { cuidSchema, paiseSchema, utcDateSchema } from './primitives';

export const PAYMENT_PROVIDER = ['mock', 'razorpay'] as const;
export type PaymentProviderName = (typeof PAYMENT_PROVIDER)[number];
export const paymentProviderSchema = z.enum(PAYMENT_PROVIDER);

export const paymentSchema = z.object({
  id: cuidSchema,
  bookingId: cuidSchema,
  provider: paymentProviderSchema,
  providerOrderId: z.string().nullable(),
  providerPaymentId: z.string().nullable(),
  amount: paiseSchema,
  status: paymentStatusSchema,
  paidAt: utcDateSchema.nullable(),
});
export type Payment = z.infer<typeof paymentSchema>;

export const createBookingResponseSchema = z.object({
  booking: z.object({
    id: cuidSchema,
    status: z.literal('PENDING'),
    startAt: utcDateSchema,
    endAt: utcDateSchema,
    quotedAmount: paiseSchema,
    holdExpiresAt: utcDateSchema,
  }),
  payment: paymentSchema,
});
export type CreateBookingResponse = z.infer<typeof createBookingResponseSchema>;

/**
 * Webhook payload, shaped like Razorpay's so the real adapter is a new file
 * rather than a refactor of the booking service. Handling is idempotent by
 * `providerPaymentId` — gateways retry, and a non-idempotent handler
 * double-issues tickets.
 */
export const paymentWebhookSchema = z.object({
  event: z.enum(['payment.captured', 'payment.failed']),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string().min(1),
        order_id: z.string().min(1),
        amount: paiseSchema,
        currency: z.literal('INR'),
        status: z.string(),
      }),
    }),
  }),
});
export type PaymentWebhook = z.infer<typeof paymentWebhookSchema>;
