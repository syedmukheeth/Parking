import { z } from 'zod';

/**
 * Every enum here is mirrored by a native Postgres enum in `schema.prisma`.
 * The database enforces the set; this file makes the API boundary enforce the
 * same set. Adding a value is a migration, treat it as a deliberate change.
 */

export const BOOKING_STATUS = [
  'PENDING',
  'CONFIRMED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
] as const;
export type BookingStatus = (typeof BOOKING_STATUS)[number];
export const bookingStatusSchema = z.enum(BOOKING_STATUS);

export const PAYMENT_STATUS = ['CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];
export const paymentStatusSchema = z.enum(PAYMENT_STATUS);

export const VEHICLE_TYPE = ['CAR', 'BIKE', 'EV_CAR', 'EV_BIKE', 'BUS'] as const;
export type VehicleType = (typeof VEHICLE_TYPE)[number];
export const vehicleTypeSchema = z.enum(VEHICLE_TYPE);

export const SLOT_CLASS = ['GENERAL', 'COVERED', 'WOMEN', 'DISABLED', 'EV'] as const;
export type SlotClass = (typeof SLOT_CLASS)[number];
export const slotClassSchema = z.enum(SLOT_CLASS);

export const USER_ROLE = ['CITIZEN', 'OPERATOR', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLE)[number];
export const userRoleSchema = z.enum(USER_ROLE);

export const LOCATION_STATUS = ['ACTIVE', 'INACTIVE', 'FULL'] as const;
export type LocationStatus = (typeof LOCATION_STATUS)[number];
export const locationStatusSchema = z.enum(LOCATION_STATUS);

export const OPERATOR_STATUS = ['ACTIVE', 'SUSPENDED'] as const;
export type OperatorStatus = (typeof OPERATOR_STATUS)[number];
export const operatorStatusSchema = z.enum(OPERATOR_STATUS);

export const PRICING_MODE = ['HOURLY', 'DAILY', 'MONTHLY'] as const;
export type PricingMode = (typeof PRICING_MODE)[number];
export const pricingModeSchema = z.enum(PRICING_MODE);

export const LOCALE = ['en', 'te'] as const;
export type Locale = (typeof LOCALE)[number];
export const localeSchema = z.enum(LOCALE);

/**
 * Location tags. A closed union rather than free text, because `?tag=` is an
 * indexed lookup against a join table and a typo would silently return nothing.
 */
export const LOCATION_TAG = [
  'cctv',
  'security',
  'ev_charging',
  'covered',
  'valet',
  'wheelchair_accessible',
  'washroom',
  'car_wash',
  'temple_shuttle',
  'well_lit',
] as const;
export type LocationTag = (typeof LOCATION_TAG)[number];
export const locationTagSchema = z.enum(LOCATION_TAG);
