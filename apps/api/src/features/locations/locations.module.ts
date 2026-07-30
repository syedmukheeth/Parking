import { Module } from '@nestjs/common';
import { LocationRepository } from './location.repository';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  controllers: [LocationsController],
  providers: [LocationsService, LocationRepository],
  exports: [LocationsService],
})
export class LocationsModule {}
