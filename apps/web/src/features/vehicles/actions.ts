'use server';

import { revalidatePath } from 'next/cache';
import {
  createVehicleRequestSchema,
  type UpdateVehicleRequest,
  updateVehicleRequestSchema,
  type Vehicle,
} from '@parkap/shared';
import { apiFetch, ApiError } from '@/lib/api';
import type { ActionResult } from '@/lib/action-result';

function toError<T>(error: unknown): ActionResult<T> {
  if (error instanceof ApiError) return { ok: false, error: error.message, code: error.code };
  return { ok: false, error: 'Something went wrong. Please try again.' };
}

/**
 * Validated here as well as in the api — the client-side parse gives the
 * citizen a plate-format message without a round trip, and the api still
 * re-validates because the client can be bypassed (CLAUDE.md frontend rules).
 */
export async function createVehicleAction(formData: FormData): Promise<ActionResult<Vehicle>> {
  const parsed = createVehicleRequestSchema.safeParse({
    vehicleNumber: formData.get('vehicleNumber'),
    vehicleType: formData.get('vehicleType'),
    label: formData.get('label') || undefined,
    isDefault: formData.get('isDefault') === 'on',
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const vehicle = await apiFetch<Vehicle>('/vehicles', { method: 'POST', body: parsed.data });
    revalidatePath('/profile');
    return { ok: true, data: vehicle };
  } catch (error) {
    return toError(error);
  }
}

export async function updateVehicleAction(
  id: string,
  input: UpdateVehicleRequest,
): Promise<ActionResult<Vehicle>> {
  const parsed = updateVehicleRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const vehicle = await apiFetch<Vehicle>(`/vehicles/${id}`, { method: 'PATCH', body: parsed.data });
    revalidatePath('/profile');
    return { ok: true, data: vehicle };
  } catch (error) {
    return toError(error);
  }
}

export async function deleteVehicleAction(id: string): Promise<ActionResult<null>> {
  try {
    await apiFetch<void>(`/vehicles/${id}`, { method: 'DELETE' });
    revalidatePath('/profile');
    return { ok: true, data: null };
  } catch (error) {
    return toError(error);
  }
}
