import { Injectable } from '@nestjs/common';
import type { CreateVehicleRequest, UpdateVehicleRequest, Vehicle } from '@parkap/shared';
import { DomainError } from '../../common/errors/domain-error';
import { VehiclesRepository } from './vehicles.repository';

/** Saved vehicles for the booking picker (docs/ROADMAP.md Phase 12). The rules
 * are small but load-bearing for the booking form, so they live here rather
 * than in the controller or the UI. */
@Injectable()
export class VehiclesService {
  constructor(private readonly repo: VehiclesRepository) {}

  list(userId: string): Promise<Vehicle[]> {
    return this.repo.listByUser(userId);
  }

  /**
   * The citizen's first vehicle becomes their default whether or not they
   * ticked the box - otherwise a one-vehicle account has nothing pre-selected
   * at booking time, which is the whole point of saving it.
   */
  async create(userId: string, input: CreateVehicleRequest): Promise<Vehicle> {
    const existing = await this.repo.listByUser(userId);
    const isDefault = input.isDefault || existing.length === 0;
    return this.repo.upsert(userId, { ...input, isDefault });
  }

  async update(userId: string, id: string, input: UpdateVehicleRequest): Promise<Vehicle> {
    const owned = await this.repo.findOwned(userId, id);
    if (!owned) throw new DomainError('NOT_FOUND', `Vehicle ${id} was not found`);
    return this.repo.update(userId, id, input);
  }

  /**
   * Past bookings are unaffected - `Booking.vehicleNumber` is a plain column,
   * not a relation to this row (docs/DATA-MODEL.md), so history keeps rendering
   * the plate the citizen actually parked with.
   */
  async remove(userId: string, id: string): Promise<void> {
    const removed = await this.repo.delete(userId, id);
    if (removed === 0) throw new DomainError('NOT_FOUND', `Vehicle ${id} was not found`);
  }
}
