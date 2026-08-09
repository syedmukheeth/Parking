import { z } from 'zod';
import { bookingStatusSchema } from './enums';
import { cuidSchema, paiseSchema, utcDateSchema } from './primitives';

/** Embedded in the booking-detail response. Never carries `token` - that only
 * ever leaves the api via the dedicated QR endpoint. */
export const ticketSummarySchema = z.object({
  id: cuidSchema,
  issuedAt: utcDateSchema,
  expiresAt: utcDateSchema,
  usedAt: utcDateSchema.nullable(),
  checkedInAt: utcDateSchema.nullable(),
  checkedOutAt: utcDateSchema.nullable(),
});
export type TicketSummary = z.infer<typeof ticketSummarySchema>;

export const ticketQrResponseSchema = z.object({
  token: z.string().min(1),
  qrDataUrl: z.string().startsWith('data:image/'),
  expiresAt: utcDateSchema,
});
export type TicketQrResponse = z.infer<typeof ticketQrResponseSchema>;

export const verifyTicketRequestSchema = z.object({ token: z.string().min(1) });
export type VerifyTicketRequest = z.infer<typeof verifyTicketRequestSchema>;

export const verifyTicketResponseSchema = z.object({
  ok: z.literal(true),
  booking: z.object({
    id: cuidSchema,
    status: bookingStatusSchema,
    vehicleNumber: z.string(),
    endAt: utcDateSchema,
  }),
  location: z.object({ id: cuidSchema, name: z.string() }),
});
export type VerifyTicketResponse = z.infer<typeof verifyTicketResponseSchema>;

export const exitTicketRequestSchema = z.object({ token: z.string().min(1) });
export type ExitTicketRequest = z.infer<typeof exitTicketRequestSchema>;

export const exitTicketResponseSchema = z.object({
  ok: z.literal(true),
  booking: z.object({ id: cuidSchema, status: bookingStatusSchema }),
  overstay: z
    .object({ minutes: z.number().int().nonnegative(), amount: paiseSchema })
    .nullable(),
});
export type ExitTicketResponse = z.infer<typeof exitTicketResponseSchema>;
