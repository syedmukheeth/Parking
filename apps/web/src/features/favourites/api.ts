import 'server-only';
import type { LocationSummary } from '@parkap/shared';
import { apiFetch } from '@/lib/api';
import { getSession } from '@/lib/session';

export function listFavourites(): Promise<LocationSummary[]> {
  return apiFetch<LocationSummary[]>('/favourites');
}

/**
 * The set of saved location ids, fetched once per page so a results list can
 * render N heart toggles without N requests. Search and location detail are
 * public pages, so this resolves to an empty set for a signed-out visitor
 * rather than calling a guarded endpoint and handling the 401.
 */
export async function favouriteIds(): Promise<Set<string>> {
  const session = await getSession();
  if (!session) return new Set();

  const favourites = await listFavourites();
  return new Set(favourites.map((location) => location.id));
}
