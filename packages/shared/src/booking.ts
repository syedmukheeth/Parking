import { z } from 'zod';
import { bookingStatusSchema, vehicleTypeSchema, type BookingStatus } from './enums';
import { paymentSchema } from './payment';
import {
  booleanQuerySchema,
  cuidSchema,
  paiseSchema,
  utcDateSchema,
  vehicleNumberSchema,
} from './primitives';
import { ticketSummarySchema } from './ticket';

/**
 * Legal booking transitions, declared as data. The api enforces these in one
 * place; nothing assigns `booking.status` directly. A state machine that can be
 * bypassed becomes decorative within a month.
 */
export const BOOKING_TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  PENDING: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
  CONFIRMED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
} as const;

export const canTransition = (from: BookingStatus, to: BookingStatus): boolean =>
  BOOKING_TRANSITIONS[from].includes(to);

const bookingWindowSchema = z
  .object({ startAt: utcDateSchema, endAt: utcDateSchema })
  .refine((w) => w.endAt.getTime() > w.startAt.getTime(), {
    message: 'endAt must be after startAt',
    path: ['endAt'],
  });

export const quoteRequestSchema = z
  .object({
    locationId: cuidSchema,
    slotTypeId: cuidSchema,
    startAt: utcDateSchema,
    endAt: utcDateSchema,
    vehicleType: vehicleTypeSchema,
  })
  .and(bookingWindowSchema);
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export const quoteLineSchema = z.object({
  label: z.string(),
  amount: paiseSchema,
});
export type QuoteLine = z.infer<typeof quoteLineSchema>;

export const quoteResponseSchema = z.object({
  amount: paiseSchema,
  currency: z.literal('INR'),
  breakdown: z.array(quoteLineSchema),
  available: z.number().int().nonnegative(),
  quoteExpiresAt: utcDateSchema,
});
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;

export const createBookingRequestSchema = z
  .object({
    locationId: cuidSchema,
    slotTypeId: cuidSchema,
    startAt: utcDateSchema,
    endAt: utcDateSchema,
    vehicleNumber: vehicleNumberSchema,
    vehicleType: vehicleTypeSchema,
  })
  .and(bookingWindowSchema);
export type CreateBookingRequest = z.infer<typeof createBookingRequestSchema>;

export const bookingSchema = z.object({
  id: cuidSchema,
  userId: cuidSchema,
  locationId: cuidSchema,
  slotTypeId: cuidSchema,
  vehicleNumber: z.string(),
  vehicleType: vehicleTypeSchema,
  startAt: utcDateSchema,
  endAt: utcDateSchema,
  status: bookingStatusSchema,
  quotedAmount: paiseSchema,
  finalAmount: paiseSchema.nullable(),
  holdExpiresAt: utcDateSchema.nullable(),
  cancelledAt: utcDateSchema.nullable(),
  cancelReason: z.string().nullable(),
  createdAt: utcDateSchema,
});
export type Booking = z.infer<typeof bookingSchema>;

export const cancelBookingRequestSchema = z.object({
  reason: z.string().trim().max(200).optional(),
});
export type CancelBookingRequest = z.infer<typeof cancelBookingRequestSchema>;

/**
 * Extension re-checks capacity for the added interval only, and can legitimately
 * fail with SLOT_UNAVAILABLE. That is a normal outcome, not an error state.
 */
export const extendBookingRequestSchema = z.object({ newEndAt: utcDateSchema });
export type ExtendBookingRequest = z.infer<typeof extendBookingRequestSchema>;

/** `GET /bookings/:id` - includes the nested payment and ticket
 * (docs/API-CONTRACT.md). */
export const bookingDetailSchema = bookingSchema.extend({
  payment: paymentSchema.nullable(),
  ticket: ticketSummarySchema.nullable(),
});
export type BookingDetail = z.infer<typeof bookingDetailSchema>;

export const listMyBookingsQuerySchema = z.object({
  status: bookingStatusSchema.optional(),
  upcoming: booleanQuerySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListMyBookingsQuery = z.infer<typeof listMyBookingsQuerySchema>;
