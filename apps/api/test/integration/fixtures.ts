import type { PrismaService } from '../../src/common/prisma/prisma.service';

let counter = 0;
/** Unique-enough per-process suffix so parallel test files never collide on
 * the phone/pincode unique constraints. */
function unique(): string {
  counter += 1;
  return `${Date.now()}${counter}`;
}

export async function createFixtureSlotType(
  prisma: PrismaService,
  opts: { capacity: number; baseAmount?: number; freeMinutes?: number },
) {
  const operator = await prisma.operator.create({
    data: { name: 'Fixture Operator', contactPhone: `+9199999${unique().slice(-5)}` },
  });
  const location = await prisma.parkingLocation.create({
    data: {
      operatorId: operator.id,
      name: 'Fixture Lot',
      address: '1 Fixture Street',
      city: 'Fixture City',
      district: 'Fixture District',
      pincode: '500001',
      lat: 17.0,
      lng: 78.0,
      is24x7: true,
    },
  });
  const slotType = await prisma.slotType.create({
    data: { locationId: location.id, vehicleType: 'CAR', slotClass: 'GENERAL', capacity: opts.capacity },
  });
  await prisma.pricingRule.create({
    data: {
      slotTypeId: slotType.id,
      mode: 'HOURLY',
      baseAmount: opts.baseAmount ?? 2000,
      freeMinutes: opts.freeMinutes ?? 0,
    },
  });
  return { operator, location, slotType };
}

export async function createFixtureUser(prisma: PrismaService) {
  // '7' + 9 digits satisfies phoneSchema's shape even though these rows are
  // written directly via Prisma and never actually pass through it.
  const suffix = unique().padStart(9, '0').slice(-9);
  return prisma.user.create({ data: { phone: `+917${suffix}` } });
}
