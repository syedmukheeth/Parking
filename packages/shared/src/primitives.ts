import { z } from 'zod';

/**
 * Money. Always integer paise: never rupees, never a float.
 * `4000` is ₹40.00. Formatting happens at the UI edge, nowhere else.
 */
export const paiseSchema = z
  .number()
  .int('Amounts are integer paise, not rupees or floats')
  .nonnegative();

/** cuid: sortable, non-guessable, no enumeration of bookings. */
export const cuidSchema = z.string().min(1).max(64);

/** E.164, India. `+91XXXXXXXXXX`. */
export const phoneSchema = z
  .string()
  .regex(/^\+91[6-9]\d{9}$/, 'Phone must be E.164 Indian format, e.g. +919876543210');

/**
 * Wall-clock time of day. Daily schedules have no date and no timezone, so they
 * are strings, storing them as DateTime invites timezone bugs on a field that
 * has none. `"00:00"`–`"23:59"` on a location means 24h.
 */
export const hhmmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected a wall-clock time in "HH:mm" form');

/** ISO 8601 UTC instant, coerced to a Date. The server clock is authoritative. */
export const utcDateSchema = z.coerce.date();

/** Indian vehicle registration. Stored uppercase with whitespace stripped. */
export const vehicleNumberSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase().replace(/\s+/g, ''))
  .pipe(
    z
      .string()
      .min(6)
      .max(13)
      .regex(/^[A-Z0-9]+$/, 'Vehicle number may contain only letters and digits'),
  );

/**
 * Query-string booleans. `z.coerce.boolean()` is wrong here, it turns the
 * string `"false"` into `true`, which silently inverts every filter.
 */
export const booleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) =>
    typeof value === 'boolean' ? value : value === 'true' || value === '1',
  );

export const latitudeSchema = z.coerce.number().min(-90).max(90);
export const longitudeSchema = z.coerce.number().min(-180).max(180);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export const paginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
  });
