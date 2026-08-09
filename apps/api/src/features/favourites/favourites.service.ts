import { Injectable } from '@nestjs/common';
import type { LocationSummary } from '@parkap/shared';
import { DomainError } from '../../common/errors/domain-error';
import { LocationsService } from '../locations/locations.service';
import { FavouritesRepository } from './favourites.repository';

/**
 * Saved locations (docs/ROADMAP.md Phase 12). Card shaping is delegated to
 * LocationsService rather than reimplemented - a service may call another
 * service (CLAUDE.md conventions), and the availability/priceFrom caveats that
 * apply to a search card apply here unchanged: display only, never a booking
 * authorisation.
 */
@Injectable()
export class FavouritesService {
  constructor(
    private readonly repo: FavouritesRepository,
    private readonly locationsService: LocationsService,
  ) {}

  async list(userId: string): Promise<LocationSummary[]> {
    const locationIds = await this.repo.listLocationIds(userId);
    return this.locationsService.getSummariesByIds(locationIds);
  }

  /**
   * Rejects an unknown location before writing - the composite key would
   * otherwise happily store a favourite pointing at nothing, which only
   * surfaces later as a silently missing row in the list.
   */
  async add(userId: string, locationId: string): Promise<void> {
    const exists = await this.locationsService.getSummariesByIds([locationId]);
    if (exists.length === 0) throw new DomainError('NOT_FOUND', `Location ${locationId} was not found`);
    await this.repo.add(userId, locationId);
  }

  async remove(userId: string, locationId: string): Promise<void> {
    await this.repo.remove(userId, locationId);
  }
}
