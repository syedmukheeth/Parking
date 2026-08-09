import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateVehicleRequest, Vehicle } from '@parkap/shared';
import { DomainError } from '../../common/errors/domain-error';
import { VehiclesService } from './vehicles.service';
import type { VehiclesRepository } from './vehicles.repository';

const CAR: Vehicle = {
  id: 'veh_1',
  vehicleNumber: 'AP21AB1234',
  vehicleType: 'CAR',
  label: 'Home car',
  isDefault: true,
};

function buildRepo(overrides: Partial<VehiclesRepository> = {}) {
  return {
    listByUser: vi.fn<VehiclesRepository['listByUser']>().mockResolvedValue([]),
    findOwned: vi.fn<VehiclesRepository['findOwned']>().mockResolvedValue(null),
    upsert: vi.fn<VehiclesRepository['upsert']>().mockResolvedValue(CAR),
    update: vi.fn<VehiclesRepository['update']>().mockResolvedValue(CAR),
    delete: vi.fn<VehiclesRepository['delete']>().mockResolvedValue(1),
    ...overrides,
  };
}

function buildService(repo: ReturnType<typeof buildRepo>): VehiclesService {
  return new VehiclesService(repo as unknown as VehiclesRepository);
}

const NEW_BIKE: CreateVehicleRequest = {
  vehicleNumber: 'AP21XX9999',
  vehicleType: 'BIKE',
  isDefault: false,
};

describe('VehiclesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('makes the first vehicle the default even when the box was left unticked', async () => {
      const repo = buildRepo();
      await buildService(repo).create('usr_1', NEW_BIKE);

      expect(repo.upsert).toHaveBeenCalledWith('usr_1', expect.objectContaining({ isDefault: true }));
    });

    it('respects an unticked box once the citizen already has a vehicle', async () => {
      const repo = buildRepo({ listByUser: vi.fn().mockResolvedValue([CAR]) });
      await buildService(repo).create('usr_1', NEW_BIKE);

      expect(repo.upsert).toHaveBeenCalledWith('usr_1', expect.objectContaining({ isDefault: false }));
    });

    it('upserts rather than rejecting a plate the citizen already saved', async () => {
      const repo = buildRepo({ listByUser: vi.fn().mockResolvedValue([CAR]) });
      const service = buildService(repo);

      await expect(
        service.create('usr_1', { ...NEW_BIKE, vehicleNumber: CAR.vehicleNumber }),
      ).resolves.toEqual(CAR);
      expect(repo.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('throws NOT_FOUND for a vehicle the caller does not own', async () => {
      const repo = buildRepo({ findOwned: vi.fn().mockResolvedValue(null) });
      const service = buildService(repo);

      // NOT_FOUND rather than FORBIDDEN on purpose — telling one citizen that
      // another's vehicle id exists is itself a leak.
      await expect(service.update('usr_2', CAR.id, { isDefault: true })).rejects.toBeInstanceOf(
        DomainError,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('writes through once ownership checks out', async () => {
      const repo = buildRepo({ findOwned: vi.fn().mockResolvedValue(CAR) });
      await buildService(repo).update('usr_1', CAR.id, { isDefault: true });

      expect(repo.update).toHaveBeenCalledWith('usr_1', CAR.id, { isDefault: true });
    });
  });

  describe('remove', () => {
    it('throws NOT_FOUND when the scoped delete matched nothing', async () => {
      const repo = buildRepo({ delete: vi.fn().mockResolvedValue(0) });
      const service = buildService(repo);

      try {
        await service.remove('usr_2', CAR.id);
        expect.unreachable('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).code).toBe('NOT_FOUND');
      }
    });

    it('resolves when a row was removed', async () => {
      const repo = buildRepo({ delete: vi.fn().mockResolvedValue(1) });
      await expect(buildService(repo).remove('usr_1', CAR.id)).resolves.toBeUndefined();
    });
  });
});
