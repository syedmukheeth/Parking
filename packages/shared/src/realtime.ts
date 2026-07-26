import { z } from 'zod';
import { bookingStatusSchema } from './enums';
import { cuidSchema } from './primitives';
import { locationAvailabilitySchema } from './location';

export const REALTIME_NAMESPACE = '/realtime';

export const locationRoom = (locationId: string): string => `location:${locationId}`;

export const subscribeLocationSchema = z.object({ locationId: cuidSchema });
export type SubscribeLocation = z.infer<typeof subscribeLocationSchema>;

/**
 * Snapshot is computed from the database and REPLACES local state — that is how
 * cache drift self-heals. Deltas are advisory; never gate a booking on one.
 */
export const availabilitySnapshotEventSchema = locationAvailabilitySchema;
export type AvailabilitySnapshotEvent = z.infer<typeof availabilitySnapshotEventSchema>;

export const availabilityDeltaEventSchema = z.object({
  locationId: cuidSchema,
  slotTypeId: cuidSchema,
  available: z.number().int(),
  occupied: z.number().int(),
});
export type AvailabilityDeltaEvent = z.infer<typeof availabilityDeltaEventSchema>;

export const bookingUpdatedEventSchema = z.object({
  bookingId: cuidSchema,
  status: bookingStatusSchema,
});
export type BookingUpdatedEvent = z.infer<typeof bookingUpdatedEventSchema>;

export const REALTIME_EVENTS = {
  subscribeLocation: 'subscribe:location',
  unsubscribeLocation: 'unsubscribe:location',
  availabilitySnapshot: 'availability:snapshot',
  availabilityDelta: 'availability:delta',
  bookingUpdated: 'booking:updated',
} as const;
