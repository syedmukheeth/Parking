import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  type LocationAvailability,
  type LocationDetail,
  type Paginated,
  type LocationSummary,
  type SearchLocationsQuery,
  searchLocationsQuerySchema,
} from '@parkap/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { LocationsService } from './locations.service';

/** HTTP only — parse, delegate, serialise. No logic lives here. */
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  search(
    @Query(new ZodValidationPipe(searchLocationsQuerySchema)) query: SearchLocationsQuery,
  ): Promise<Paginated<LocationSummary>> {
    return this.locationsService.search(query);
  }

  @Get(':id')
  detail(@Param('id') id: string): Promise<LocationDetail> {
    return this.locationsService.getDetail(id);
  }

  @Get(':id/availability')
  availability(@Param('id') id: string): Promise<LocationAvailability> {
    return this.locationsService.getAvailability(id);
  }
}
