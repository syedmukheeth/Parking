import { Injectable } from '@nestjs/common';
import type { BookingStatus } from '@parkap/shared';
import { REALTIME_EVENTS, locationRoom, userRoom } from '@parkap/shared';
import { LocationRepository } from '../locations/location.repository';
import { RealtimeGateway } from './realtime.gateway';

/**
 * The one place BookingsService/TicketsService reach to push realtime
 * events — they never touch the gateway's Socket.IO server directly. Imports
 * LocationRepository (from LocationsModule) to recompute the delta; never
 * BookingRepository, which would create a cycle since bookings already
 * depends on this module.
 */
@Injectable()
export class RealtimePublisher {
  constructor(
    private readonly gateway: RealtimeGateway,
    private readonly locationRepo: LocationRepository,
  ) {}

  async publishAvailabilityDelta(slotTypeId: string): Promise<void> {
    const slotType = await this.locationRepo.findSlotTypeCapacity(slotTypeId);
    if (!slotType) return;

    const occupiedMap = await this.locationRepo.occupiedCountsNow([slotTypeId], new Date());
    const occupied = occupiedMap.get(slotTypeId) ?? 0;
    const available = Math.max(0, slotType.capacity - occupied);

    this.gateway.server
      ?.to(locationRoom(slotType.locationId))
      .emit(REALTIME_EVENTS.availabilityDelta, {
        locationId: slotType.locationId,
        slotTypeId,
        available,
        occupied,
      });
  }

  emitBookingUpdated(userId: string, bookingId: string, status: BookingStatus): void {
    this.gateway.server?.to(userRoom(userId)).emit(REALTIME_EVENTS.bookingUpdated, { bookingId, status });
  }
}
