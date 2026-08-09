import { Injectable } from '@nestjs/common';
import type { Prisma, SlotClass, VehicleType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { BoundingBox } from './geo';

const CANDIDATE_INCLUDE = {
  tags: true,
  slotTypes: { include: { pricingRules: true } },
} satisfies Prisma.ParkingLocationInclude;

export type LocationCandidate = Prisma.ParkingLocationGetPayload<{ include: typeof CANDIDATE_INCLUDE }>;

export interface SearchCandidateParams {
  bbox?: BoundingBox;
  q?: string;
  vehicleType?: VehicleType;
  slotClass?: SlotClass;
  tags?: string[];
}

/** All Prisma access for the locations feature lives here (parkap-backend skill). */
@Injectable()
export class LocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCandidates(params: SearchCandidateParams): Promise<LocationCandidate[]> {
    const slotTypeFilter: Prisma.SlotTypeWhereInput = {};
    if (params.vehicleType) slotTypeFilter.vehicleType = params.vehicleType;
    if (params.slotClass) slotTypeFilter.slotClass = params.slotClass;

    const where: Prisma.ParkingLocationWhereInput = {
      status: 'ACTIVE',
      ...(params.bbox && {
        lat: { gte: params.bbox.minLat, lte: params.bbox.maxLat },
        lng: { gte: params.bbox.minLng, lte: params.bbox.maxLng },
      }),
      ...(params.q && {
        OR: [
          { name: { contains: params.q, mode: 'insensitive' } },
          { address: { contains: params.q, mode: 'insensitive' } },
          { city: { contains: params.q, mode: 'insensitive' } },
        ],
      }),
      ...(Object.keys(slotTypeFilter).length > 0 && { slotTypes: { some: slotTypeFilter } }),
      ...(params.tags &&
        params.tags.length > 0 && {
          AND: params.tags.map((tag) => ({ tags: { some: { tag } } })),
        }),
    };

    return this.prisma.parkingLocation.findMany({ where, include: CANDIDATE_INCLUDE });
  }

  async findById(id: string): Promise<LocationCandidate | null> {
    return this.prisma.parkingLocation.findUnique({ where: { id }, include: CANDIDATE_INCLUDE });
  }

  /** One query for a known set of ids — the favourites list would otherwise
   * fan out to one `findById` per saved location. */
  async findByIds(ids: string[]): Promise<LocationCandidate[]> {
    if (ids.length === 0) return [];
    return this.prisma.parkingLocation.findMany({
      where: { id: { in: ids } },
      include: CANDIDATE_INCLUDE,
    });
  }

  /** Minimal projection for the realtime feature — avoids RealtimeModule
   * depending on BookingsModule's repository, which would create a cycle
   * (bookings already depends on realtime to publish deltas). */
  async findSlotTypeCapacity(
    slotTypeId: string,
  ): Promise<{ id: string; locationId: string; capacity: number } | null> {
    return this.prisma.slotType.findUnique({
      where: { id: slotTypeId },
      select: { id: true, locationId: true, capacity: true },
    });
  }

  /**
   * Occupied count "right now" per slot type, in one grouped query — never one
   * query per location. Used for the results-card availability badge and the
   * detail/availability endpoints. This is a read, not the transactional
   * capacity check that guards a real reservation (docs/DATA-MODEL.md).
   */
  async occupiedCountsNow(slotTypeIds: string[], now: Date): Promise<Map<string, number>> {
    if (slotTypeIds.length === 0) return new Map();

    const rows = await this.prisma.booking.groupBy({
      by: ['slotTypeId'],
      where: {
        slotTypeId: { in: slotTypeIds },
        status: { in: ['CONFIRMED', 'ACTIVE'] },
        startAt: { lte: now },
        endAt: { gt: now },
      },
      _count: { _all: true },
    });

    return new Map(rows.map((row) => [row.slotTypeId, row._count._all]));
  }
}
