import { z } from 'zod';
import { localeSchema, userRoleSchema, vehicleTypeSchema } from './enums';
import { cuidSchema, phoneSchema, vehicleNumberSchema } from './primitives';

export const userSchema = z.object({
  id: cuidSchema,
  phone: phoneSchema,
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  role: userRoleSchema,
  locale: localeSchema,
});
export type User = z.infer<typeof userSchema>;

export const updateMeRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    email: z.string().email(),
    locale: localeSchema,
  })
  .partial();
export type UpdateMeRequest = z.infer<typeof updateMeRequestSchema>;

export const requestOtpRequestSchema = z.object({ phone: phoneSchema });
export type RequestOtpRequest = z.infer<typeof requestOtpRequestSchema>;

export const requestOtpResponseSchema = z.object({
  requestId: z.string(),
  expiresInSeconds: z.number().int().positive(),
});
export type RequestOtpResponse = z.infer<typeof requestOtpResponseSchema>;

export const verifyOtpRequestSchema = z.object({
  requestId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, 'OTP is six digits'),
});
export type VerifyOtpRequest = z.infer<typeof verifyOtpRequestSchema>;

/**
 * The session JWT payload. Signed by apps/web (which owns sessions) with
 * BETTER_AUTH_SECRET; apps/api verifies with the same shared secret and never
 * issues one itself (docs/ARCHITECTURE.md §6).
 */
export const sessionPayloadSchema = z.object({
  sub: cuidSchema,
  phone: phoneSchema,
  role: userRoleSchema,
});
export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

export const vehicleSchema = z.object({
  id: cuidSchema,
  vehicleNumber: vehicleNumberSchema,
  vehicleType: vehicleTypeSchema,
  label: z.string().nullable(),
  isDefault: z.boolean(),
});
export type Vehicle = z.infer<typeof vehicleSchema>;

export const createVehicleRequestSchema = z.object({
  vehicleNumber: vehicleNumberSchema,
  vehicleType: vehicleTypeSchema,
  label: z.string().trim().max(40).optional(),
  isDefault: z.boolean().default(false),
});
export type CreateVehicleRequest = z.infer<typeof createVehicleRequestSchema>;
