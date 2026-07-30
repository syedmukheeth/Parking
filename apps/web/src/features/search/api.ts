import 'server-only';
import type { LocationSummary, Paginated, SearchLocationsQuery } from '@parkap/shared';
import { apiFetch } from '@/lib/api';

export function searchLocations(query: Partial<SearchLocationsQuery>): Promise<Paginated<LocationSummary>> {
  return apiFetch<Paginated<LocationSummary>>('/locations', {
    auth: false,
    query: {
      q: query.q,
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm,
      vehicleType: query.vehicleType,
      slotClass: query.slotClass,
      openNow: query.openNow,
      availableOnly: query.availableOnly,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
    },
  });
}
