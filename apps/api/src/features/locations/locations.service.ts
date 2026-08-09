import { Injectable } from '@nestjs/common';
import type {
  LocationAvailability,
  LocationDetail,
  LocationSummary,
  LocationTag as LocationTagUnion,
  Paginated,
  SearchLocationsQuery,
  SlotTypeAvailability,
} from '@parkap/shared';
import { DomainError } from '../../common/errors/domain-error';
import { boundingBox, haversineKm, walkingMinutes } from './geo';
import { LocationRepository, type LocationCandidate } from './location.repository';
import { isOpenNow, nowHHmmIST } from './time';

type SlotType = LocationCandidate['slotTypes'][number];

@Injectable()
export class LocationsService {
  constructor(private readonly repo: LocationRepository) {}

  async search(query: SearchLocationsQuery): Promise<Paginated<LocationSummary>> {
    const hasOrigin = query.lat !== undefined && query.lng !== undefined;
    const bbox = hasOrigin ? boundingBox(query.lat as number, query.lng as number, query.radiusKm) : undefined;

    const candidates = await this.repo.findCandidates({
      bbox,
      q: query.q,
      vehicleType: query.vehicleType,
      slotClass: query.slotClass,
      tags: query.tags,
    });

    const now = new Date();
    const nowHHmm = nowHHmmIST(now);
    const occupied = await this.repo.occupiedCountsNow(
      candidates.flatMap((c) => c.slotTypes.map((s) => s.id)),
      now,
    );

    type Row = { candidate: LocationCandidate; summary: LocationSummary };

    let rows: Row[] = candidates.map((candidate) => ({
      candidate,
      summary: this.buildSummary(candidate, occupied, query, hasOrigin),
    }));

    if (hasOrigin) {
      rows = rows.filter((row) => (row.summary.distanceKm ?? Infinity) <= query.radiusKm);
    }
    if (query.openNow) {
      rows = rows.filter((row) =>
        isOpenNow(row.candidate.openTime, row.candidate.closeTime, row.candidate.is24x7, nowHHmm),
      );
    }
    if (query.availableOnly) {
      rows = rows.filter((row) => row.summary.availability.available > 0);
    }

    rows = this.sortRows(rows, query.sort);

    const total = rows.length;
    const start = (query.page - 1) * query.limit;
    const items = rows.slice(start, start + query.limit).map((row) => row.summary);

    return { items, page: query.page, limit: query.limit, total };
  }

  async getDetail(id: string): Promise<LocationDetail> {
    const location = await this.repo.findById(id);
    if (!location) throw new DomainError('NOT_FOUND', `Location ${id} was not found`);

    const now = new Date();
    const occupied = await this.repo.occupiedCountsNow(
      location.slotTypes.map((s) => s.id),
      now,
    );
    const summary = this.buildSummary(location, occupied, { lat: undefined, lng: undefined }, false);

    return {
      ...summary,
      district: location.district,
      pincode: location.pincode,
      contactPhone: location.contactPhone,
      slotTypes: location.slotTypes.map((slot) => ({
        id: slot.id,
        vehicleType: slot.vehicleType,
        slotClass: slot.slotClass,
        capacity: slot.capacity,
        available: Math.max(0, slot.capacity - (occupied.get(slot.id) ?? 0)),
        pricing: slot.pricingRules.map((rule) => ({
          mode: rule.mode,
          baseAmount: rule.baseAmount,
          freeMinutes: rule.freeMinutes,
        })),
      })),
    };
  }

  /**
   * Results-card summaries for a known set of ids, in the order given. Exists
   * so the favourites feature renders the exact same card shape as search
   * instead of re-deriving `priceFrom`/availability itself — that duplication
   * is how the two views drift apart.
   */
  async getSummariesByIds(ids: string[]): Promise<LocationSummary[]> {
    if (ids.length === 0) return [];

    const locations = await this.repo.findByIds(ids);
    const now = new Date();
    const occupied = await this.repo.occupiedCountsNow(
      locations.flatMap((location) => location.slotTypes.map((slot) => slot.id)),
      now,
    );

    const byId = new Map(
      locations.map((location) => [
        location.id,
        this.buildSummary(location, occupied, { lat: undefined, lng: undefined }, false),
      ]),
    );

    // Preserve the caller's ordering, and drop ids that no longer resolve —
    // a location can be deleted while a favourite still points at it.
    return ids.flatMap((id) => {
      const summary = byId.get(id);
      return summary ? [summary] : [];
    });
  }

  /** Computed from the database, never the cache — the reconciliation path
   * that lets realtime cache drift self-heal (docs/API-CONTRACT.md). */
  async getAvailability(id: string): Promise<LocationAvailability> {
    const location = await this.repo.findById(id);
    if (!location) throw new DomainError('NOT_FOUND', `Location ${id} was not found`);

    const now = new Date();
    const occupied = await this.repo.occupiedCountsNow(
      location.slotTypes.map((s) => s.id),
      now,
    );

    const slotTypes: SlotTypeAvailability[] = location.slotTypes.map((slot) => {
      const occupiedCount = occupied.get(slot.id) ?? 0;
      return {
        slotTypeId: slot.id,
        capacity: slot.capacity,
        occupied: occupiedCount,
        available: Math.max(0, slot.capacity - occupiedCount),
      };
    });

    return { locationId: id, updatedAt: now, slotTypes };
  }

  private relevantSlotTypes(
    location: LocationCandidate,
    query: Pick<SearchLocationsQuery, 'vehicleType' | 'slotClass'>,
  ): SlotType[] {
    return location.slotTypes.filter(
      (slot) =>
        (!query.vehicleType || slot.vehicleType === query.vehicleType) &&
        (!query.slotClass || slot.slotClass === query.slotClass),
    );
  }

  private buildSummary(
    location: LocationCandidate,
    occupied: Map<string, number>,
    query: Pick<SearchLocationsQuery, 'vehicleType' | 'slotClass' | 'lat' | 'lng'>,
    hasOrigin: boolean,
  ): LocationSummary {
    const relevant = this.relevantSlotTypes(location, query);

    const totalCapacity = relevant.reduce((sum, slot) => sum + slot.capacity, 0);
    const totalAvailable = relevant.reduce(
      (sum, slot) => sum + Math.max(0, slot.capacity - (occupied.get(slot.id) ?? 0)),
      0,
    );

    const hourlyRates = relevant
      .flatMap((slot) => slot.pricingRules.filter((rule) => rule.mode === 'HOURLY'))
      .map((rule) => rule.baseAmount);
    const priceFrom = hourlyRates.length > 0 ? Math.min(...hourlyRates) : null;

    const distanceKm = hasOrigin
      ? haversineKm(query.lat as number, query.lng as number, location.lat, location.lng)
      : undefined;

    return {
      id: location.id,
      name: location.name,
      address: location.address,
      city: location.city,
      lat: location.lat,
      lng: location.lng,
      distanceKm: distanceKm !== undefined ? Math.round(distanceKm * 10) / 10 : undefined,
      walkingMinutes: distanceKm !== undefined ? walkingMinutes(distanceKm) : undefined,
      photos: Array.isArray(location.photos) ? (location.photos as string[]) : [],
      is24x7: location.is24x7,
      openTime: location.openTime,
      closeTime: location.closeTime,
      status: location.status,
      tags: location.tags.map((tag) => tag.tag) as LocationTagUnion[],
      priceFrom,
      availability: { total: totalCapacity, available: totalAvailable },
    };
  }

  private sortRows<T extends { summary: LocationSummary }>(
    rows: T[],
    sort: SearchLocationsQuery['sort'],
  ): T[] {
    const sorted = [...rows];
    switch (sort) {
      case 'price':
        sorted.sort((a, b) => (a.summary.priceFrom ?? Infinity) - (b.summary.priceFrom ?? Infinity));
        break;
      case 'availability':
        sorted.sort((a, b) => b.summary.availability.available - a.summary.availability.available);
        break;
      case 'distance':
      default:
        sorted.sort((a, b) => (a.summary.distanceKm ?? Infinity) - (b.summary.distanceKm ?? Infinity));
        break;
    }
    return sorted;
  }
}
