import { Module } from '@nestjs/common';
import { LocationRepository } from './location.repository';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  controllers: [LocationsController],
  providers: [LocationsService, LocationRepository],
  // LocationRepository is exported for RealtimeModule, which needs slot-type
  // capacity without depending on BookingsModule (that would cycle — bookings
  // already depends on realtime to publish deltas).
  exports: [LocationsService, LocationRepository],
})
export class LocationsModule {}
