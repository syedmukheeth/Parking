import { Injectable } from '@nestjs/common';
import type { CreateVehicleRequest, UpdateVehicleRequest, Vehicle } from '@parkap/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

interface VehicleRow {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  label: string | null;
  isDefault: boolean;
}

function toVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    vehicleNumber: row.vehicleNumber,
    vehicleType: row.vehicleType as Vehicle['vehicleType'],
    label: row.label,
    isDefault: row.isDefault,
  };
}

/**
 * All Prisma access for the vehicles feature lives here (parkap-backend skill).
 *
 * Every write that can set `isDefault` runs inside a transaction that first
 * clears the flag on the user's other rows — two vehicles both claiming to be
 * the default would make the booking form's pre-selection a coin flip.
 *
 * Every by-id operation is scoped by `userId` in the `where` clause rather than
 * fetched-then-compared, so one citizen can never learn whether another's
 * vehicle id exists.
 */
@Injectable()
export class VehiclesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Default first, then oldest — the order the profile list and the booking
   * picker both render in. */
  async listByUser(userId: string): Promise<Vehicle[]> {
    const rows = await this.prisma.vehicle.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map(toVehicle);
  }

  async findOwned(userId: string, id: string): Promise<Vehicle | null> {
    const row = await this.prisma.vehicle.findFirst({ where: { id, userId } });
    return row ? toVehicle(row) : null;
  }

  /**
   * Upsert on the existing `@@unique([userId, vehicleNumber])`. Re-adding a
   * plate the citizen already saved updates that row instead of failing —
   * "you already have this vehicle" is not an error worth an error code.
   */
  async upsert(userId: string, input: CreateVehicleRequest): Promise<Vehicle> {
    const data = {
      vehicleType: input.vehicleType,
      label: input.label ?? null,
      isDefault: input.isDefault,
    };

    const row = await this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.vehicle.updateMany({ where: { userId }, data: { isDefault: false } });
      }
      return tx.vehicle.upsert({
        where: { userId_vehicleNumber: { userId, vehicleNumber: input.vehicleNumber } },
        create: { userId, vehicleNumber: input.vehicleNumber, ...data },
        update: data,
      });
    });

    return toVehicle(row);
  }

  async update(userId: string, id: string, input: UpdateVehicleRequest): Promise<Vehicle> {
    const row = await this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.vehicle.updateMany({ where: { userId }, data: { isDefault: false } });
      }
      // `updateMany` (not `update`) so the userId scope is part of the write
      // itself; the caller has already confirmed ownership.
      await tx.vehicle.updateMany({
        where: { id, userId },
        data: {
          ...(input.vehicleType !== undefined && { vehicleType: input.vehicleType }),
          ...(input.label !== undefined && { label: input.label }),
          ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
        },
      });
      return tx.vehicle.findFirstOrThrow({ where: { id, userId } });
    });

    return toVehicle(row);
  }

  /** Returns how many rows were removed so the service can tell a miss from a
   * successful delete without a second query. */
  async delete(userId: string, id: string): Promise<number> {
    const result = await this.prisma.vehicle.deleteMany({ where: { id, userId } });
    return result.count;
  }
}
