/**
 * Idempotent seed — safe to re-run.
 *
 * Real Andhra Pradesh place names, not "Test Lot 1". Fake names make a
 * stakeholder review about the data instead of the product, and they hide geo
 * bugs that only appear with genuinely spread-out coordinates.
 *
 * IDs are explicit and slug-shaped so re-running upserts rather than duplicates.
 * All money is integer paise.
 */
import { PrismaClient, type PricingMode, type SlotClass, type VehicleType } from '@prisma/client';

const prisma = new PrismaClient();

const RUPEE = 100; // paise

type PricingSeed = {
  mode: PricingMode;
  baseAmount: number;
  freeMinutes?: number;
  priority?: number;
};

type SlotSeed = {
  id: string;
  vehicleType: VehicleType;
  slotClass?: SlotClass;
  capacity: number;
  pricing: PricingSeed[];
};

type LocationSeed = {
  id: string;
  operatorId: string;
  name: string;
  address: string;
  city: string;
  district: string;
  pincode: string;
  lat: number;
  lng: number;
  openTime?: string;
  closeTime?: string;
  is24x7?: boolean;
  contactPhone?: string;
  tags: string[];
  slotTypes: SlotSeed[];
};

const operators = [
  {
    id: 'op_ttd_parking',
    name: 'TTD Parking Services',
    contactPhone: '+918772264000',
    contactEmail: 'parking@ttdsevaonline.example',
    gstin: '37AAACT1234A1Z5',
  },
  {
    id: 'op_gvmc_parking',
    name: 'GVMC Urban Parking',
    contactPhone: '+918912565100',
    contactEmail: 'parking@gvmc.example',
    gstin: '37AAACG5678B1Z2',
  },
  {
    id: 'op_vmc_parking',
    name: 'Vijayawada Municipal Parking',
    contactPhone: '+918662422121',
    contactEmail: 'parking@vmc.example',
    gstin: null,
  },
  {
    id: 'op_ap_tourism',
    name: 'AP Tourism Parking',
    contactPhone: '+918632340288',
    contactEmail: 'parking@aptourism.example',
    gstin: null,
  },
];

const locations: LocationSeed[] = [
  {
    id: 'loc_tirumala_main',
    operatorId: 'op_ttd_parking',
    name: 'Tirumala Main Parking',
    address: 'Near Vaikuntam Queue Complex, Tirumala',
    city: 'Tirupati',
    district: 'Tirupati',
    pincode: '517504',
    lat: 13.6833,
    lng: 79.3474,
    is24x7: true,
    contactPhone: '+918772277777',
    tags: ['cctv', 'security', 'temple_shuttle', 'washroom', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_tirumala_car',
        vehicleType: 'CAR',
        capacity: 240,
        pricing: [
          { mode: 'HOURLY', baseAmount: 20 * RUPEE, freeMinutes: 15 },
          { mode: 'DAILY', baseAmount: 150 * RUPEE },
        ],
      },
      {
        id: 'slt_tirumala_bike',
        vehicleType: 'BIKE',
        capacity: 400,
        pricing: [
          { mode: 'HOURLY', baseAmount: 10 * RUPEE, freeMinutes: 15 },
          { mode: 'DAILY', baseAmount: 60 * RUPEE },
        ],
      },
      {
        id: 'slt_tirumala_bus',
        vehicleType: 'BUS',
        capacity: 60,
        pricing: [{ mode: 'HOURLY', baseAmount: 60 * RUPEE }],
      },
    ],
  },
  {
    id: 'loc_alipiri_toll',
    operatorId: 'op_ttd_parking',
    name: 'Alipiri Toll Gate Parking',
    address: 'Alipiri Road, foot of the Tirumala ghat',
    city: 'Tirupati',
    district: 'Tirupati',
    pincode: '517501',
    lat: 13.6172,
    lng: 79.4184,
    openTime: '04:00',
    closeTime: '23:00',
    contactPhone: '+918772264000',
    tags: ['cctv', 'security', 'temple_shuttle'],
    slotTypes: [
      {
        id: 'slt_alipiri_car',
        vehicleType: 'CAR',
        capacity: 120,
        pricing: [
          { mode: 'HOURLY', baseAmount: 15 * RUPEE, freeMinutes: 30 },
          { mode: 'DAILY', baseAmount: 100 * RUPEE },
        ],
      },
      {
        id: 'slt_alipiri_bike',
        vehicleType: 'BIKE',
        capacity: 180,
        pricing: [{ mode: 'HOURLY', baseAmount: 8 * RUPEE, freeMinutes: 30 }],
      },
    ],
  },
  {
    id: 'loc_rk_beach',
    operatorId: 'op_gvmc_parking',
    name: 'RK Beach Road Parking',
    address: 'Beach Road, opposite Kali Temple, Visakhapatnam',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    pincode: '530003',
    lat: 17.7156,
    lng: 83.3242,
    openTime: '05:00',
    closeTime: '23:30',
    contactPhone: '+918912565100',
    tags: ['cctv', 'well_lit', 'washroom'],
    slotTypes: [
      {
        id: 'slt_rkbeach_car',
        vehicleType: 'CAR',
        capacity: 90,
        pricing: [
          { mode: 'HOURLY', baseAmount: 25 * RUPEE, freeMinutes: 15 },
          { mode: 'DAILY', baseAmount: 180 * RUPEE },
        ],
      },
      {
        id: 'slt_rkbeach_bike',
        vehicleType: 'BIKE',
        capacity: 150,
        pricing: [{ mode: 'HOURLY', baseAmount: 10 * RUPEE, freeMinutes: 15 }],
      },
      {
        id: 'slt_rkbeach_ev',
        vehicleType: 'EV_CAR',
        slotClass: 'EV',
        capacity: 12,
        pricing: [{ mode: 'HOURLY', baseAmount: 30 * RUPEE }],
      },
    ],
  },
  {
    id: 'loc_benz_circle',
    operatorId: 'op_vmc_parking',
    name: 'Benz Circle Multi-Level Parking',
    address: 'MG Road, Benz Circle, Vijayawada',
    city: 'Vijayawada',
    district: 'NTR',
    pincode: '520010',
    lat: 16.4991,
    lng: 80.6558,
    is24x7: true,
    contactPhone: '+918662422121',
    tags: ['cctv', 'covered', 'security', 'ev_charging', 'wheelchair_accessible', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_benz_car_covered',
        vehicleType: 'CAR',
        slotClass: 'COVERED',
        capacity: 200,
        pricing: [
          { mode: 'HOURLY', baseAmount: 30 * RUPEE, freeMinutes: 30 },
          { mode: 'DAILY', baseAmount: 200 * RUPEE },
          { mode: 'MONTHLY', baseAmount: 3500 * RUPEE },
        ],
      },
      {
        id: 'slt_benz_car_women',
        vehicleType: 'CAR',
        slotClass: 'WOMEN',
        capacity: 20,
        pricing: [{ mode: 'HOURLY', baseAmount: 30 * RUPEE, freeMinutes: 30 }],
      },
      {
        id: 'slt_benz_disabled',
        vehicleType: 'CAR',
        slotClass: 'DISABLED',
        capacity: 10,
        pricing: [{ mode: 'HOURLY', baseAmount: 0, freeMinutes: 120 }],
      },
      {
        id: 'slt_benz_ev',
        vehicleType: 'EV_CAR',
        slotClass: 'EV',
        capacity: 16,
        pricing: [{ mode: 'HOURLY', baseAmount: 40 * RUPEE }],
      },
      {
        id: 'slt_benz_bike',
        vehicleType: 'BIKE',
        capacity: 220,
        pricing: [{ mode: 'HOURLY', baseAmount: 12 * RUPEE, freeMinutes: 30 }],
      },
    ],
  },
  {
    id: 'loc_guntur_bus_station',
    operatorId: 'op_vmc_parking',
    name: 'Guntur NTR Bus Station Parking',
    address: 'NTR Bus Station, Kothapet, Guntur',
    city: 'Guntur',
    district: 'Guntur',
    pincode: '522001',
    lat: 16.3067,
    lng: 80.4365,
    is24x7: true,
    contactPhone: '+918632234567',
    tags: ['cctv', 'security', 'washroom'],
    slotTypes: [
      {
        id: 'slt_guntur_car',
        vehicleType: 'CAR',
        capacity: 70,
        pricing: [
          { mode: 'HOURLY', baseAmount: 20 * RUPEE, freeMinutes: 20 },
          { mode: 'DAILY', baseAmount: 120 * RUPEE },
        ],
      },
      {
        id: 'slt_guntur_bike',
        vehicleType: 'BIKE',
        capacity: 260,
        pricing: [{ mode: 'HOURLY', baseAmount: 8 * RUPEE, freeMinutes: 20 }],
      },
    ],
  },
  {
    id: 'loc_araku_viewpoint',
    operatorId: 'op_ap_tourism',
    name: 'Araku Valley Viewpoint Parking',
    address: 'Padmapuram Gardens Road, Araku Valley',
    city: 'Araku Valley',
    district: 'Alluri Sitharama Raju',
    pincode: '531149',
    lat: 18.3273,
    lng: 82.8779,
    openTime: '06:00',
    closeTime: '19:00',
    contactPhone: '+918936249033',
    tags: ['washroom', 'security'],
    slotTypes: [
      {
        id: 'slt_araku_car',
        vehicleType: 'CAR',
        capacity: 45,
        pricing: [
          { mode: 'HOURLY', baseAmount: 20 * RUPEE, freeMinutes: 30 },
          { mode: 'DAILY', baseAmount: 100 * RUPEE },
        ],
      },
      {
        id: 'slt_araku_bus',
        vehicleType: 'BUS',
        capacity: 12,
        pricing: [{ mode: 'HOURLY', baseAmount: 50 * RUPEE }],
      },
    ],
  },
  {
    id: 'loc_srisailam_temple',
    operatorId: 'op_ap_tourism',
    name: 'Srisailam Temple Parking',
    address: 'Mallikarjuna Swamy Temple Road, Srisailam',
    city: 'Srisailam',
    district: 'Nandyal',
    pincode: '518102',
    lat: 16.0748,
    lng: 78.8687,
    openTime: '04:30',
    closeTime: '22:30',
    contactPhone: '+918524287777',
    tags: ['cctv', 'security', 'temple_shuttle', 'washroom'],
    slotTypes: [
      {
        id: 'slt_srisailam_car',
        vehicleType: 'CAR',
        capacity: 110,
        pricing: [
          { mode: 'HOURLY', baseAmount: 15 * RUPEE, freeMinutes: 30 },
          { mode: 'DAILY', baseAmount: 90 * RUPEE },
        ],
      },
      {
        id: 'slt_srisailam_bike',
        vehicleType: 'BIKE',
        capacity: 200,
        pricing: [{ mode: 'HOURLY', baseAmount: 8 * RUPEE, freeMinutes: 30 }],
      },
    ],
  },
];

async function main(): Promise<void> {
  for (const operator of operators) {
    await prisma.operator.upsert({
      where: { id: operator.id },
      create: operator,
      update: {
        name: operator.name,
        contactPhone: operator.contactPhone,
        contactEmail: operator.contactEmail,
        gstin: operator.gstin,
      },
    });
  }

  for (const location of locations) {
    const { tags, slotTypes, ...fields } = location;

    const data = {
      ...fields,
      openTime: fields.openTime ?? '00:00',
      closeTime: fields.closeTime ?? '23:59',
      is24x7: fields.is24x7 ?? false,
      photos: [] as string[],
    };

    await prisma.parkingLocation.upsert({
      where: { id: location.id },
      create: data,
      update: data,
    });

    // Tags are a full replace — the seed file is the source of truth for them.
    await prisma.locationTag.deleteMany({
      where: { locationId: location.id, tag: { notIn: tags } },
    });
    for (const tag of tags) {
      await prisma.locationTag.upsert({
        where: { locationId_tag: { locationId: location.id, tag } },
        create: { locationId: location.id, tag },
        update: {},
      });
    }

    for (const slot of slotTypes) {
      const slotData = {
        id: slot.id,
        locationId: location.id,
        vehicleType: slot.vehicleType,
        slotClass: slot.slotClass ?? ('GENERAL' as SlotClass),
        capacity: slot.capacity,
      };

      await prisma.slotType.upsert({
        where: { id: slot.id },
        create: slotData,
        update: slotData,
      });

      // Pricing rules carry deterministic ids so re-seeding updates in place
      // rather than stacking duplicate rules at the same priority.
      for (const [index, rule] of slot.pricing.entries()) {
        const ruleData = {
          id: `${slot.id}_price_${index}`,
          slotTypeId: slot.id,
          mode: rule.mode,
          baseAmount: rule.baseAmount,
          freeMinutes: rule.freeMinutes ?? 0,
          priority: rule.priority ?? 0,
        };
        await prisma.pricingRule.upsert({
          where: { id: ruleData.id },
          create: ruleData,
          update: ruleData,
        });
      }
    }
  }

  const [operatorCount, locationCount, slotTypeCount, pricingCount] = await Promise.all([
    prisma.operator.count(),
    prisma.parkingLocation.count(),
    prisma.slotType.count(),
    prisma.pricingRule.count(),
  ]);

  console.warn(
    `[seed] ${operatorCount} operators · ${locationCount} locations · ` +
      `${slotTypeCount} slot types · ${pricingCount} pricing rules`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('[seed] failed', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
