import { PrismaService } from '../../src/common/prisma/prisma.service';

/**
 * Integration specs need a real Postgres. Locally that's opt-in, so they skip
 * when TEST_DATABASE_URL is absent rather than failing `npm run test` for
 * everyone. In CI it's provisioned (.github/workflows/ci.yml), so a missing
 * value there means the job is silently proving nothing - fail loudly instead.
 */
export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);

if (!hasTestDatabase && process.env.CI) {
  throw new Error(
    'TEST_DATABASE_URL is not set in CI - the integration specs would silently skip. See test/integration/README.md.',
  );
}

export function createTestPrisma(): PrismaService {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set - point it at a real Postgres test database (never dev/prod). See test/integration/README.md.',
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
