import { PrismaService } from '../../src/common/prisma/prisma.service';

export function createTestPrisma(): PrismaService {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set — point it at a real Postgres test database (never dev/prod). See test/integration/README.md.',
    );
  }
  return new PrismaService({ datasources: { db: { url } } });
}

/** Truncate in FK-safe order. Order-independent tests re-seed their own
 * fixture in beforeEach, so this just clears the slate. */
export async function truncateAll(prisma: PrismaService): Promise<void> {
  await prisma.payment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.locationTag.deleteMany();
  await prisma.slotType.deleteMany();
  await prisma.favouriteLocation.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.parkingLocation.deleteMany();
  await prisma.operator.deleteMany();
  await prisma.user.deleteMany();
}
