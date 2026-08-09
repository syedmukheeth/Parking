'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import type { ActionResult } from '@/lib/action-result';

/**
 * Both directions are idempotent on the api (composite primary key), so a
 * double-click or a retried action settles on the state the citizen last
 * asked for rather than toggling twice.
 */
export async function setFavouriteAction(
  locationId: string,
  isFavourite: boolean,
): Promise<ActionResult<boolean>> {
  try {
    await apiFetch<void>(`/favourites/${locationId}`, { method: isFavourite ? 'PUT' : 'DELETE' });
    revalidatePath('/profile');
    revalidatePath('/search');
    revalidatePath(`/locations/${locationId}`);
    return { ok: true, data: isFavourite };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error: error.message, code: error.code };
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}
