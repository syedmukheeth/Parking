import { z } from 'zod';
import {
  locationStatusSchema,
  locationTagSchema,
  pricingModeSchema,
  slotClassSchema,
  vehicleTypeSchema,
} from './enums';
import {
  booleanQuerySchema,
  cuidSchema,
  hhmmSchema,
  latitudeSchema,
  longitudeSchema,
  paiseSchema,
} from './primitives';

export const LOCATION_SORT = ['distance', 'price', 'availability'] as const;
export type LocationSort = (typeof LOCATION_SORT)[number];
export const locationSortSchema = z.enum(LOCATION_SORT);

const csvOf = <T extends z.ZodTypeAny>(item: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .transform((value) => (Array.isArray(value) ? value : value.split(',')))
    .transform((values) => values.map((v) => v.trim()).filter(Boolean))
    .pipe(z.array(item));

export const searchLocationsQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),
    lat: latitudeSchema.optional(),
    lng: longitudeSchema.optional(),
    radiusKm: z.coerce.number().positive().max(50).default(5),
    vehicleType: vehicleTypeSchema.optional(),
    slotClass: slotClassSchema.optional(),
    tags: csvOf(locationTagSchema).optional(),
    openNow: booleanQuerySchema.optional(),
    availableOnly: booleanQuerySchema.optional(),
    sort: locationSortSchema.default('distance'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((q) => (q.lat === undefined) === (q.lng === undefined), {
    message: 'lat and lng must be provided together',
    path: ['lat'],
  })
  .refine((q) => q.sort !== 'distance' || q.lat !== undefined || q.q !== undefined, {
    message: 'Distance sort needs lat/lng, or use a text query',
    path: ['sort'],
  });
export type SearchLocationsQuery = z.infer<typeof searchLocationsQuerySchema>;

export const availabilityCountSchema = z.object({
  total: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
});
export type AvailabilityCount = z.infer<typeof availabilityCountSchema>;

/**
 * A results-card view of a location. `priceFrom` is the cheapest hourly rate
 * across the location's slot types — enough to render a card, never enough to
 * price a booking. Quotes come from POST /bookings/quote.
 */
export const locationSummarySchema = z.object({
  id: cuidSchema,
  name: z.string(),
  address: z.string(),
  city: z.string(),
  lat: z.number(),
  lng: z.number(),
  distanceKm: z.number().optional(),
  walkingMinutes: z.number().int().optional(),
  photos: z.array(z.string()),
  is24x7: z.boolean(),
  openTime: hhmmSchema,
  closeTime: hhmmSchema,
  status: locationStatusSchema,
  tags: z.array(locationTagSchema),
  priceFrom: paiseSchema.nullable(),
  availability: availabilityCountSchema,
});
export type LocationSummary = z.infer<typeof locationSummarySchema>;

/**
 * A favourite is just a location the citizen saved — it reuses the results-card
 * shape rather than defining a parallel one (CLAUDE.md §9). `priceFrom` and
 * `availability` carry the same display-only caveats they do in search results.
 */
export const favouriteLocationsResponseSchema = z.array(locationSummarySchema);
export type FavouriteLocationsResponse = z.infer<typeof favouriteLocationsResponseSchema>;

export const pricingRuleSummarySchema = z.object({
  mode: pricingModeSchema,
  baseAmount: paiseSchema,
  freeMinutes: z.number().int().nonnegative(),
});
export type PricingRuleSummary = z.infer<typeof pricingRuleSummarySchema>;

export const slotTypeDetailSchema = z.object({
  id: cuidSchema,
  vehicleType: vehicleTypeSchema,
  slotClass: slotClassSchema,
  capacity: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
  pricing: z.array(pricingRuleSummarySchema),
});
export type SlotTypeDetail = z.infer<typeof slotTypeDetailSchema>;

export const locationDetailSchema = locationSummarySchema.extend({
  district: z.string(),
  pincode: z.string(),
  contactPhone: z.string().nullable(),
  slotTypes: z.array(slotTypeDetailSchema),
});
export type LocationDetail = z.infer<typeof locationDetailSchema>;

export const slotTypeAvailabilitySchema = z.object({
  slotTypeId: cuidSchema,
  capacity: z.number().int().nonnegative(),
  occupied: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
});
export type SlotTypeAvailability = z.infer<typeof slotTypeAvailabilitySchema>;

/**
 * Computed from the database, never from the cache — this is the
 * reconciliation path that lets cache drift self-heal.
 */
export const locationAvailabilitySchema = z.object({
  locationId: cuidSchema,
  updatedAt: z.coerce.date(),
  slotTypes: z.array(slotTypeAvailabilitySchema),
});
export type LocationAvailability = z.infer<typeof locationAvailabilitySchema>;
