import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/** All Prisma access for the favourites feature lives here (parkap-backend
 * skill). `FavouriteLocation` has a composite primary key `[userId,
 * locationId]`, which is what makes add/remove naturally idempotent. */
@Injectable()
export class FavouritesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Most recently saved first. */
  async listLocationIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.favouriteLocation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { locationId: true },
    });
    return rows.map((row) => row.locationId);
  }

  /** Idempotent - saving a lot twice is the same as saving it once. */
  async add(userId: string, locationId: string): Promise<void> {
    await this.prisma.favouriteLocation.upsert({
      where: { userId_locationId: { userId, locationId } },
      create: { userId, locationId },
      update: {},
    });
  }

  /** Idempotent - removing something already gone is a success, not a 404. */
  async remove(userId: string, locationId: string): Promise<void> {
    await this.prisma.favouriteLocation.deleteMany({ where: { userId, locationId } });
  }
}
