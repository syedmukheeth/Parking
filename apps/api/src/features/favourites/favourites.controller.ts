import { Controller, Delete, Get, HttpCode, Param, Put, UseGuards } from '@nestjs/common';
import type { LocationSummary, SessionPayload } from '@parkap/shared';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { SessionGuard } from '../../common/auth/session.guard';
import { FavouritesService } from './favourites.service';

/**
 * HTTP only - parse, delegate, serialise. `PUT`/`DELETE` rather than `POST`
 * because both are idempotent: the citizen's intent is "this lot is saved" /
 * "this lot is not saved", not "append an event".
 */
@UseGuards(SessionGuard)
@Controller('favourites')
export class FavouritesController {
  constructor(private readonly favouritesService: FavouritesService) {}

  @Get()
  list(@CurrentUser() user: SessionPayload): Promise<LocationSummary[]> {
    return this.favouritesService.list(user.sub);
  }

  @Put(':locationId')
  @HttpCode(204)
  add(@CurrentUser() user: SessionPayload, @Param('locationId') locationId: string): Promise<void> {
    return this.favouritesService.add(user.sub, locationId);
  }

  @Delete(':locationId')
  @HttpCode(204)
  remove(@CurrentUser() user: SessionPayload, @Param('locationId') locationId: string): Promise<void> {
    return this.favouritesService.remove(user.sub, locationId);
  }
}
