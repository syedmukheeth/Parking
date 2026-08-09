/**
 * Idempotent seed, safe to re-run.
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
  {
    id: 'op_knl_municipal',
    name: 'Kurnool Municipal Corporation',
    contactPhone: '+918518277243',
    contactEmail: 'parking@kmc.example',
    gstin: '37AAACK1234C1Z5',
  },
  {
    id: 'op_apsrtc',
    name: 'APSRTC Terminal Parking',
    contactPhone: '+918662570005',
    contactEmail: 'parking@apsrtc.example',
    gstin: '37AAACA9012D1Z7',
  },
  {
    id: 'op_smartpark',
    name: 'SmartPark Solutions',
    contactPhone: '+918912780450',
    contactEmail: 'ops@smartpark.example',
    gstin: '37AAACS3456E1Z9',
  },
  {
    id: 'op_railway_parking',
    name: 'South Central Railway Parking',
    contactPhone: '+918662576789',
    contactEmail: 'parking@scr.example',
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

  // ─────────────────────────────────────────────────────────────
  // Kurnool
  // ─────────────────────────────────────────────────────────────
  {
    id: 'loc_knl_rtc',
    operatorId: 'op_apsrtc',
    name: 'Kurnool RTC Bus Stand Parking',
    address: 'Bellary Road, opposite RTC Bus Stand',
    city: 'Kurnool',
    district: 'Kurnool',
    pincode: '518001',
    lat: 15.8222,
    lng: 78.0413,
    is24x7: true,
    contactPhone: '+918518277001',
    tags: ['cctv', 'security', 'washroom', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_knl_rtc_car',
        vehicleType: 'CAR',
        capacity: 90,
        pricing: [
          { mode: 'HOURLY', baseAmount: 20 * RUPEE, freeMinutes: 15 },
          { mode: 'DAILY', baseAmount: 120 * RUPEE },
        ],
      },
      {
        id: 'slt_knl_rtc_bike',
        vehicleType: 'BIKE',
        capacity: 220,
        pricing: [{ mode: 'HOURLY', baseAmount: 10 * RUPEE, freeMinutes: 15 }],
      },
    ],
  },
  {
    id: 'loc_knl_railway',
    operatorId: 'op_railway_parking',
    name: 'Kurnool City Railway Parking',
    address: 'Station Road, Kurnool City Junction',
    city: 'Kurnool',
    district: 'Kurnool',
    pincode: '518004',
    lat: 15.8103,
    lng: 78.0553,
    is24x7: true,
    contactPhone: '+918518277002',
    tags: ['cctv', 'security', 'well_lit', 'wheelchair_accessible'],
    slotTypes: [
      {
        id: 'slt_knl_rail_car',
        vehicleType: 'CAR',
        capacity: 60,
        pricing: [
          { mode: 'HOURLY', baseAmount: 25 * RUPEE, freeMinutes: 10 },
          { mode: 'DAILY', baseAmount: 150 * RUPEE },
        ],
      },
      {
        id: 'slt_knl_rail_bike',
        vehicleType: 'BIKE',
        capacity: 150,
        pricing: [{ mode: 'HOURLY', baseAmount: 12 * RUPEE, freeMinutes: 10 }],
      },
    ],
  },
  {
    id: 'loc_knl_oldtown',
    operatorId: 'op_knl_municipal',
    name: 'Konda Reddy Fort Market Parking',
    address: 'Old Town, near Konda Reddy Buruju',
    city: 'Kurnool',
    district: 'Kurnool',
    pincode: '518001',
    lat: 15.8281,
    lng: 78.0373,
    openTime: '07:00',
    closeTime: '22:00',
    contactPhone: '+918518277003',
    tags: ['well_lit', 'security'],
    slotTypes: [
      {
        id: 'slt_knl_old_car',
        // Deliberately tight: a busy market lot that regularly shows amber.
        vehicleType: 'CAR',
        capacity: 28,
        pricing: [{ mode: 'HOURLY', baseAmount: 15 * RUPEE, freeMinutes: 20 }],
      },
      {
        id: 'slt_knl_old_bike',
        vehicleType: 'BIKE',
        capacity: 120,
        pricing: [{ mode: 'HOURLY', baseAmount: 8 * RUPEE, freeMinutes: 20 }],
      },
    ],
  },
  {
    id: 'loc_knl_medical',
    operatorId: 'op_knl_municipal',
    name: 'Kurnool Medical College Visitor Parking',
    address: 'Budhawarpeta, Kurnool Medical College campus',
    city: 'Kurnool',
    district: 'Kurnool',
    pincode: '518002',
    lat: 15.8069,
    lng: 78.0442,
    is24x7: true,
    contactPhone: '+918518277004',
    tags: ['cctv', 'wheelchair_accessible', 'washroom', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_knl_med_car',
        vehicleType: 'CAR',
        capacity: 70,
        pricing: [
          { mode: 'HOURLY', baseAmount: 10 * RUPEE, freeMinutes: 30 },
          { mode: 'DAILY', baseAmount: 70 * RUPEE },
        ],
      },
      {
        id: 'slt_knl_med_disabled',
        vehicleType: 'CAR',
        slotClass: 'DISABLED',
        capacity: 10,
        pricing: [{ mode: 'HOURLY', baseAmount: 0, freeMinutes: 60 }],
      },
      {
        id: 'slt_knl_med_bike',
        vehicleType: 'BIKE',
        capacity: 180,
        pricing: [{ mode: 'HOURLY', baseAmount: 5 * RUPEE, freeMinutes: 30 }],
      },
    ],
  },

  {
    id: 'loc_knl_anand_cinema',
    operatorId: 'op_smartpark',
    name: 'Anand Cinema Complex Parking',
    address: 'Park Road, next to Anand Theatre',
    city: 'Kurnool',
    district: 'Kurnool',
    pincode: '518001',
    lat: 15.829,
    lng: 78.05,
    openTime: '09:00',
    closeTime: '23:59',
    contactPhone: '+918518277010',
    tags: ['cctv', 'security', 'well_lit', 'covered'],
    slotTypes: [
      {
        id: 'slt_knl_anand_car',
        vehicleType: 'CAR',
        slotClass: 'COVERED',
        capacity: 60,
        pricing: [
          { mode: 'HOURLY', baseAmount: 25 * RUPEE, freeMinutes: 15 },
          { mode: 'DAILY', baseAmount: 140 * RUPEE },
        ],
      },
      {
        id: 'slt_knl_anand_bike',
        vehicleType: 'BIKE',
        capacity: 180,
        pricing: [{ mode: 'HOURLY', baseAmount: 10 * RUPEE, freeMinutes: 15 }],
      },
    ],
  },
  {
    id: 'loc_knl_svc_complex',
    operatorId: 'op_smartpark',
    name: 'SVC Complex Parking',
    address: 'Raj Vihar Centre, opposite SVC Complex',
    city: 'Kurnool',
    district: 'Kurnool',
    pincode: '518001',
    lat: 15.832,
    lng: 78.046,
    openTime: '08:00',
    closeTime: '22:30',
    contactPhone: '+918518277011',
    tags: ['cctv', 'covered', 'valet', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_knl_svc_car',
        vehicleType: 'CAR',
        slotClass: 'COVERED',
        capacity: 45,
        pricing: [
          { mode: 'HOURLY', baseAmount: 30 * RUPEE, freeMinutes: 15 },
          { mode: 'DAILY', baseAmount: 180 * RUPEE },
          { mode: 'MONTHLY', baseAmount: 2200 * RUPEE },
        ],
      },
      {
        id: 'slt_knl_svc_bike',
        vehicleType: 'BIKE',
        capacity: 140,
        pricing: [{ mode: 'HOURLY', baseAmount: 12 * RUPEE, freeMinutes: 15 }],
      },
    ],
  },
  {
    id: 'loc_knl_rajvihar',
    operatorId: 'op_knl_municipal',
    name: 'Raj Vihar Centre Parking',
    address: 'Raj Vihar Circle, Kurnool town centre',
    city: 'Kurnool',
    district: 'Kurnool',
    pincode: '518001',
    lat: 15.8335,
    lng: 78.0445,
    openTime: '07:00',
    closeTime: '23:00',
    contactPhone: '+918518277012',
    tags: ['well_lit', 'security', 'washroom'],
    slotTypes: [
      {
        id: 'slt_knl_raj_car',
        // Town centre, small and busy: this is the lot that goes amber first.
        vehicleType: 'CAR',
        capacity: 30,
        pricing: [{ mode: 'HOURLY', baseAmount: 20 * RUPEE, freeMinutes: 20 }],
      },
      {
        id: 'slt_knl_raj_bike',
        vehicleType: 'BIKE',
        capacity: 130,
        pricing: [{ mode: 'HOURLY', baseAmount: 8 * RUPEE, freeMinutes: 20 }],
      },
    ],
  },
  {
    id: 'loc_knl_c_camp',
    operatorId: 'op_knl_municipal',
    name: 'C Camp Circle Parking',
    address: 'C Camp Road, near the circle',
    city: 'Kurnool',
    district: 'Kurnool',
    pincode: '518002',
    lat: 15.821,
    lng: 78.033,
    is24x7: true,
    contactPhone: '+918518277013',
    tags: ['well_lit', 'cctv'],
    slotTypes: [
      {
        id: 'slt_knl_ccamp_car',
        vehicleType: 'CAR',
        capacity: 55,
        pricing: [
          { mode: 'HOURLY', baseAmount: 15 * RUPEE, freeMinutes: 20 },
          { mode: 'DAILY', baseAmount: 90 * RUPEE },
        ],
      },
      {
        id: 'slt_knl_ccamp_bike',
        vehicleType: 'BIKE',
        capacity: 160,
        pricing: [{ mode: 'HOURLY', baseAmount: 6 * RUPEE, freeMinutes: 20 }],
      },
    ],
  },
  {
    id: 'loc_knl_kothapeta',
    operatorId: 'op_knl_municipal',
    name: 'Kothapeta Market Parking',
    address: 'Kothapeta main bazaar road',
    city: 'Kurnool',
    district: 'Kurnool',
    pincode: '518001',
    lat: 15.827,
    lng: 78.04,
    openTime: '06:00',
    closeTime: '21:30',
    contactPhone: '+918518277014',
    tags: ['well_lit'],
    slotTypes: [
      {
        id: 'slt_knl_kotha_car',
        vehicleType: 'CAR',
        capacity: 24,
        pricing: [{ mode: 'HOURLY', baseAmount: 15 * RUPEE, freeMinutes: 30 }],
      },
      {
        id: 'slt_knl_kotha_bike',
        vehicleType: 'BIKE',
        capacity: 220,
        pricing: [{ mode: 'HOURLY', baseAmount: 5 * RUPEE, freeMinutes: 30 }],
      },
    ],
  },
  {
    id: 'loc_knl_bhagyanagar',
    operatorId: 'op_knl_municipal',
    name: 'Bhagya Nagar Colony Parking',
    address: 'Bhagya Nagar main road, Kurnool',
    city: 'Kurnool',
    district: 'Kurnool',
    pincode: '518004',
    lat: 15.81,
    lng: 78.025,
    is24x7: true,
    contactPhone: '+918518277015',
    tags: ['security', 'well_lit', 'ev_charging'],
    slotTypes: [
      {
        id: 'slt_knl_bhagya_car',
        vehicleType: 'CAR',
        capacity: 70,
        pricing: [
          { mode: 'HOURLY', baseAmount: 15 * RUPEE, freeMinutes: 30 },
          { mode: 'MONTHLY', baseAmount: 1500 * RUPEE },
        ],
      },
      {
        id: 'slt_knl_bhagya_ev',
        vehicleType: 'EV_CAR',
        slotClass: 'EV',
        capacity: 8,
        pricing: [{ mode: 'HOURLY', baseAmount: 30 * RUPEE, freeMinutes: 15 }],
      },
      {
        id: 'slt_knl_bhagya_bike',
        vehicleType: 'BIKE',
        capacity: 190,
        pricing: [{ mode: 'HOURLY', baseAmount: 6 * RUPEE, freeMinutes: 30 }],
      },
    ],
  },
  {
    id: 'loc_knl_gayatri_estates',
    operatorId: 'op_smartpark',
    name: 'Gayatri Estates Parking',
    address: 'Gayatri Estates, Nandyal Road',
    city: 'Kurnool',
    district: 'Kurnool',
    pincode: '518002',
    lat: 15.818,
    lng: 78.053,
    openTime: '08:00',
    closeTime: '22:00',
    contactPhone: '+918518277016',
    tags: ['cctv', 'covered', 'car_wash', 'washroom'],
    slotTypes: [
      {
        id: 'slt_knl_gayatri_car',
        vehicleType: 'CAR',
        slotClass: 'COVERED',
        capacity: 50,
        pricing: [
          { mode: 'HOURLY', baseAmount: 25 * RUPEE, freeMinutes: 15 },
          { mode: 'DAILY', baseAmount: 150 * RUPEE },
        ],
      },
      {
        id: 'slt_knl_gayatri_women',
        vehicleType: 'CAR',
        slotClass: 'WOMEN',
        capacity: 10,
        pricing: [{ mode: 'HOURLY', baseAmount: 25 * RUPEE, freeMinutes: 15 }],
      },
      {
        id: 'slt_knl_gayatri_bike',
        vehicleType: 'BIKE',
        capacity: 120,
        pricing: [{ mode: 'HOURLY', baseAmount: 10 * RUPEE, freeMinutes: 15 }],
      },
    ],
  },
  {
    id: 'loc_knl_viswabharathi',
    operatorId: 'op_knl_municipal',
    name: 'Viswabharathi Hospital Parking',
    address: 'Penchikalapadu, Bangalore Highway',
    city: 'Kurnool',
    district: 'Kurnool',
    pincode: '518002',
    lat: 15.7955,
    lng: 78.0155,
    is24x7: true,
    contactPhone: '+918518277017',
    tags: ['cctv', 'security', 'wheelchair_accessible', 'washroom', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_knl_visw_car',
        vehicleType: 'CAR',
        capacity: 80,
        pricing: [
          { mode: 'HOURLY', baseAmount: 10 * RUPEE, freeMinutes: 30 },
          { mode: 'DAILY', baseAmount: 80 * RUPEE },
        ],
      },
      {
        id: 'slt_knl_visw_disabled',
        vehicleType: 'CAR',
        slotClass: 'DISABLED',
        capacity: 12,
        pricing: [{ mode: 'HOURLY', baseAmount: 0, freeMinutes: 120 }],
      },
      {
        id: 'slt_knl_visw_bike',
        vehicleType: 'BIKE',
        capacity: 200,
        pricing: [{ mode: 'HOURLY', baseAmount: 5 * RUPEE, freeMinutes: 30 }],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Vijayawada
  // ─────────────────────────────────────────────────────────────
  {
    id: 'loc_vja_benz_circle',
    operatorId: 'op_vmc_parking',
    name: 'Benz Circle Multilevel Parking',
    address: 'Eluru Road at Benz Circle',
    city: 'Vijayawada',
    district: 'NTR',
    pincode: '520008',
    lat: 16.4977,
    lng: 80.665,
    is24x7: true,
    contactPhone: '+918662475010',
    tags: ['cctv', 'security', 'covered', 'ev_charging', 'washroom', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_vja_benz_car',
        vehicleType: 'CAR',
        slotClass: 'COVERED',
        capacity: 160,
        pricing: [
          { mode: 'HOURLY', baseAmount: 30 * RUPEE, freeMinutes: 15 },
          { mode: 'DAILY', baseAmount: 200 * RUPEE },
          { mode: 'MONTHLY', baseAmount: 2500 * RUPEE },
        ],
      },
      {
        id: 'slt_vja_benz_ev',
        vehicleType: 'EV_CAR',
        slotClass: 'EV',
        capacity: 16,
        pricing: [{ mode: 'HOURLY', baseAmount: 40 * RUPEE, freeMinutes: 10 }],
      },
      {
        id: 'slt_vja_benz_bike',
        vehicleType: 'BIKE',
        capacity: 200,
        pricing: [{ mode: 'HOURLY', baseAmount: 15 * RUPEE, freeMinutes: 15 }],
      },
    ],
  },
  {
    id: 'loc_vja_railway',
    operatorId: 'op_railway_parking',
    name: 'Vijayawada Junction Parking',
    address: 'Station Road, Vijayawada Junction',
    city: 'Vijayawada',
    district: 'NTR',
    pincode: '520003',
    lat: 16.5175,
    lng: 80.6236,
    is24x7: true,
    contactPhone: '+918662576001',
    tags: ['cctv', 'security', 'washroom', 'wheelchair_accessible', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_vja_rail_car',
        vehicleType: 'CAR',
        capacity: 120,
        pricing: [
          { mode: 'HOURLY', baseAmount: 30 * RUPEE, freeMinutes: 10 },
          { mode: 'DAILY', baseAmount: 180 * RUPEE },
        ],
      },
      {
        id: 'slt_vja_rail_bike',
        vehicleType: 'BIKE',
        capacity: 300,
        pricing: [{ mode: 'HOURLY', baseAmount: 12 * RUPEE, freeMinutes: 10 }],
      },
    ],
  },
  {
    id: 'loc_vja_durga_temple',
    operatorId: 'op_ap_tourism',
    name: 'Kanaka Durga Temple Parking',
    address: 'Indrakeeladri Hill, Seetha Nagar',
    city: 'Vijayawada',
    district: 'NTR',
    pincode: '520001',
    lat: 16.5138,
    lng: 80.6089,
    openTime: '04:00',
    closeTime: '22:30',
    contactPhone: '+918662426555',
    tags: ['temple_shuttle', 'security', 'washroom', 'wheelchair_accessible'],
    slotTypes: [
      {
        id: 'slt_vja_durga_car',
        vehicleType: 'CAR',
        capacity: 140,
        pricing: [{ mode: 'HOURLY', baseAmount: 20 * RUPEE, freeMinutes: 30 }],
      },
      {
        id: 'slt_vja_durga_bike',
        vehicleType: 'BIKE',
        capacity: 350,
        pricing: [{ mode: 'HOURLY', baseAmount: 10 * RUPEE, freeMinutes: 30 }],
      },
      {
        id: 'slt_vja_durga_bus',
        vehicleType: 'BUS',
        capacity: 25,
        pricing: [{ mode: 'HOURLY', baseAmount: 80 * RUPEE }],
      },
    ],
  },
  {
    id: 'loc_vja_pnbs',
    operatorId: 'op_apsrtc',
    name: 'Pandit Nehru Bus Station Parking',
    address: 'Machavaram, PNBS complex',
    city: 'Vijayawada',
    district: 'NTR',
    pincode: '520004',
    lat: 16.5122,
    lng: 80.6198,
    is24x7: true,
    contactPhone: '+918662570010',
    tags: ['cctv', 'security', 'washroom', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_vja_pnbs_car',
        vehicleType: 'CAR',
        capacity: 80,
        pricing: [
          { mode: 'HOURLY', baseAmount: 25 * RUPEE, freeMinutes: 15 },
          { mode: 'DAILY', baseAmount: 150 * RUPEE },
        ],
      },
      {
        id: 'slt_vja_pnbs_bike',
        vehicleType: 'BIKE',
        capacity: 260,
        pricing: [{ mode: 'HOURLY', baseAmount: 10 * RUPEE, freeMinutes: 15 }],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Visakhapatnam
  // ─────────────────────────────────────────────────────────────
  {
    id: 'loc_vzg_rk_beach',
    operatorId: 'op_gvmc_parking',
    // Distinct from the existing `loc_rk_beach` a few hundred metres north:
    // two lots on the same road need names a citizen can tell apart.
    name: 'Kursura Submarine Museum Parking',
    address: 'Beach Road, near Kursura Submarine Museum',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    pincode: '530023',
    lat: 17.7113,
    lng: 83.3208,
    openTime: '05:00',
    closeTime: '23:30',
    contactPhone: '+918912565201',
    tags: ['security', 'well_lit', 'washroom', 'wheelchair_accessible'],
    slotTypes: [
      {
        id: 'slt_vzg_rk_car',
        vehicleType: 'CAR',
        capacity: 110,
        pricing: [
          { mode: 'HOURLY', baseAmount: 25 * RUPEE, freeMinutes: 20 },
          { mode: 'DAILY', baseAmount: 140 * RUPEE },
        ],
      },
      {
        id: 'slt_vzg_rk_bike',
        vehicleType: 'BIKE',
        capacity: 280,
        pricing: [{ mode: 'HOURLY', baseAmount: 10 * RUPEE, freeMinutes: 20 }],
      },
    ],
  },
  {
    id: 'loc_vzg_railway',
    operatorId: 'op_railway_parking',
    name: 'Visakhapatnam Station Parking',
    address: 'Station Approach Road, Dabagardens',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    pincode: '530020',
    lat: 17.7231,
    lng: 83.3013,
    is24x7: true,
    contactPhone: '+918912746001',
    tags: ['cctv', 'security', 'covered', 'washroom', 'wheelchair_accessible', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_vzg_rail_car',
        vehicleType: 'CAR',
        slotClass: 'COVERED',
        capacity: 130,
        pricing: [
          { mode: 'HOURLY', baseAmount: 30 * RUPEE, freeMinutes: 10 },
          { mode: 'DAILY', baseAmount: 180 * RUPEE },
        ],
      },
      {
        id: 'slt_vzg_rail_bike',
        vehicleType: 'BIKE',
        capacity: 320,
        pricing: [{ mode: 'HOURLY', baseAmount: 12 * RUPEE, freeMinutes: 10 }],
      },
    ],
  },
  {
    id: 'loc_vzg_jagadamba',
    operatorId: 'op_smartpark',
    name: 'Jagadamba Junction Parking',
    address: 'Jagadamba Centre, Dabagardens',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    pincode: '530020',
    lat: 17.7113,
    lng: 83.3033,
    openTime: '08:00',
    closeTime: '23:00',
    contactPhone: '+918912780451',
    tags: ['cctv', 'covered', 'valet', 'car_wash', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_vzg_jag_car',
        // Small and central, the lot most likely to read red at peak.
        vehicleType: 'CAR',
        slotClass: 'COVERED',
        capacity: 24,
        pricing: [
          { mode: 'HOURLY', baseAmount: 40 * RUPEE, freeMinutes: 10 },
          { mode: 'DAILY', baseAmount: 250 * RUPEE },
        ],
      },
      {
        id: 'slt_vzg_jag_bike',
        vehicleType: 'BIKE',
        capacity: 90,
        pricing: [{ mode: 'HOURLY', baseAmount: 15 * RUPEE, freeMinutes: 10 }],
      },
    ],
  },
  {
    id: 'loc_vzg_rushikonda',
    operatorId: 'op_ap_tourism',
    name: 'Rushikonda Beach Parking',
    address: 'Rushikonda Beach Road, near IT SEZ',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    pincode: '530045',
    lat: 17.7826,
    lng: 83.3866,
    openTime: '06:00',
    closeTime: '21:00',
    contactPhone: '+918912565202',
    tags: ['security', 'washroom', 'ev_charging'],
    slotTypes: [
      {
        id: 'slt_vzg_rush_car',
        vehicleType: 'CAR',
        capacity: 85,
        pricing: [{ mode: 'HOURLY', baseAmount: 20 * RUPEE, freeMinutes: 30 }],
      },
      {
        id: 'slt_vzg_rush_ev',
        vehicleType: 'EV_CAR',
        slotClass: 'EV',
        capacity: 10,
        pricing: [{ mode: 'HOURLY', baseAmount: 35 * RUPEE, freeMinutes: 15 }],
      },
      {
        id: 'slt_vzg_rush_bike',
        vehicleType: 'BIKE',
        capacity: 160,
        pricing: [{ mode: 'HOURLY', baseAmount: 10 * RUPEE, freeMinutes: 30 }],
      },
    ],
  },
  {
    id: 'loc_vzg_kailasagiri',
    operatorId: 'op_ap_tourism',
    name: 'Kailasagiri Hill Park Parking',
    address: 'Kailasagiri Hill Top Road',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    pincode: '530043',
    lat: 17.7492,
    lng: 83.3407,
    openTime: '09:00',
    closeTime: '20:00',
    contactPhone: '+918912565203',
    tags: ['security', 'washroom', 'wheelchair_accessible'],
    slotTypes: [
      {
        id: 'slt_vzg_kail_car',
        vehicleType: 'CAR',
        capacity: 65,
        pricing: [{ mode: 'HOURLY', baseAmount: 25 * RUPEE, freeMinutes: 20 }],
      },
      {
        id: 'slt_vzg_kail_bike',
        vehicleType: 'BIKE',
        capacity: 140,
        pricing: [{ mode: 'HOURLY', baseAmount: 10 * RUPEE, freeMinutes: 20 }],
      },
      {
        id: 'slt_vzg_kail_bus',
        vehicleType: 'BUS',
        capacity: 12,
        pricing: [{ mode: 'HOURLY', baseAmount: 70 * RUPEE }],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Tirupati
  // ─────────────────────────────────────────────────────────────
  {
    id: 'loc_tpt_railway',
    operatorId: 'op_railway_parking',
    name: 'Tirupati Main Station Parking',
    address: 'Station Approach, Tirupati Main',
    city: 'Tirupati',
    district: 'Tirupati',
    pincode: '517501',
    lat: 13.6288,
    lng: 79.4192,
    is24x7: true,
    contactPhone: '+918772225001',
    tags: ['cctv', 'security', 'washroom', 'wheelchair_accessible', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_tpt_rail_car',
        vehicleType: 'CAR',
        capacity: 100,
        pricing: [
          { mode: 'HOURLY', baseAmount: 25 * RUPEE, freeMinutes: 15 },
          { mode: 'DAILY', baseAmount: 160 * RUPEE },
        ],
      },
      {
        id: 'slt_tpt_rail_bike',
        vehicleType: 'BIKE',
        capacity: 280,
        pricing: [{ mode: 'HOURLY', baseAmount: 10 * RUPEE, freeMinutes: 15 }],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Guntur
  // ─────────────────────────────────────────────────────────────
  {
    id: 'loc_gnt_railway',
    operatorId: 'op_railway_parking',
    name: 'Guntur Junction Parking',
    address: 'Kothapeta, Guntur Junction',
    city: 'Guntur',
    district: 'Guntur',
    pincode: '522001',
    lat: 16.3067,
    lng: 80.4365,
    is24x7: true,
    contactPhone: '+918632222001',
    tags: ['cctv', 'security', 'washroom', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_gnt_rail_car',
        vehicleType: 'CAR',
        capacity: 75,
        pricing: [
          { mode: 'HOURLY', baseAmount: 20 * RUPEE, freeMinutes: 15 },
          { mode: 'DAILY', baseAmount: 130 * RUPEE },
        ],
      },
      {
        id: 'slt_gnt_rail_bike',
        vehicleType: 'BIKE',
        capacity: 200,
        pricing: [{ mode: 'HOURLY', baseAmount: 10 * RUPEE, freeMinutes: 15 }],
      },
    ],
  },
  {
    id: 'loc_gnt_brodipet',
    operatorId: 'op_smartpark',
    name: 'Brodipet Market Parking',
    address: '4th Line, Brodipet',
    city: 'Guntur',
    district: 'Guntur',
    pincode: '522002',
    lat: 16.3009,
    lng: 80.438,
    openTime: '08:00',
    closeTime: '21:30',
    contactPhone: '+918632222002',
    tags: ['well_lit', 'cctv'],
    slotTypes: [
      {
        id: 'slt_gnt_brod_car',
        vehicleType: 'CAR',
        capacity: 34,
        pricing: [{ mode: 'HOURLY', baseAmount: 20 * RUPEE, freeMinutes: 20 }],
      },
      {
        id: 'slt_gnt_brod_bike',
        vehicleType: 'BIKE',
        capacity: 110,
        pricing: [{ mode: 'HOURLY', baseAmount: 8 * RUPEE, freeMinutes: 20 }],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Nellore
  // ─────────────────────────────────────────────────────────────
  {
    id: 'loc_nlr_rtc',
    operatorId: 'op_apsrtc',
    name: 'Nellore RTC Bus Stand Parking',
    address: 'Grand Trunk Road, RTC Bus Stand',
    city: 'Nellore',
    district: 'Sri Potti Sriramulu Nellore',
    pincode: '524001',
    lat: 14.4426,
    lng: 79.9865,
    is24x7: true,
    contactPhone: '+918612331001',
    tags: ['cctv', 'security', 'washroom', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_nlr_rtc_car',
        vehicleType: 'CAR',
        capacity: 65,
        pricing: [
          { mode: 'HOURLY', baseAmount: 20 * RUPEE, freeMinutes: 15 },
          { mode: 'DAILY', baseAmount: 120 * RUPEE },
        ],
      },
      {
        id: 'slt_nlr_rtc_bike',
        vehicleType: 'BIKE',
        capacity: 190,
        pricing: [{ mode: 'HOURLY', baseAmount: 8 * RUPEE, freeMinutes: 15 }],
      },
    ],
  },
  {
    id: 'loc_nlr_railway',
    operatorId: 'op_railway_parking',
    name: 'Nellore Station Parking',
    address: 'Station Road, Nellore Railway Station',
    city: 'Nellore',
    district: 'Sri Potti Sriramulu Nellore',
    pincode: '524001',
    lat: 14.4494,
    lng: 79.9855,
    is24x7: true,
    contactPhone: '+918612331002',
    tags: ['cctv', 'security', 'wheelchair_accessible', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_nlr_rail_car',
        vehicleType: 'CAR',
        capacity: 55,
        pricing: [
          { mode: 'HOURLY', baseAmount: 25 * RUPEE, freeMinutes: 10 },
          { mode: 'DAILY', baseAmount: 140 * RUPEE },
        ],
      },
      {
        id: 'slt_nlr_rail_bike',
        vehicleType: 'BIKE',
        capacity: 160,
        pricing: [{ mode: 'HOURLY', baseAmount: 10 * RUPEE, freeMinutes: 10 }],
      },
    ],
  },
  {
    id: 'loc_nlr_ranganatha',
    operatorId: 'op_ap_tourism',
    name: 'Ranganatha Temple Parking',
    address: 'Temple Street, near Sri Ranganatha Swamy Temple',
    city: 'Nellore',
    district: 'Sri Potti Sriramulu Nellore',
    pincode: '524001',
    lat: 14.438,
    lng: 79.986,
    openTime: '05:00',
    closeTime: '21:00',
    contactPhone: '+918612331003',
    tags: ['temple_shuttle', 'washroom', 'security'],
    slotTypes: [
      {
        id: 'slt_nlr_rang_car',
        vehicleType: 'CAR',
        capacity: 40,
        pricing: [{ mode: 'HOURLY', baseAmount: 15 * RUPEE, freeMinutes: 30 }],
      },
      {
        id: 'slt_nlr_rang_bike',
        vehicleType: 'BIKE',
        capacity: 150,
        pricing: [{ mode: 'HOURLY', baseAmount: 5 * RUPEE, freeMinutes: 30 }],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Rajahmundry
  // ─────────────────────────────────────────────────────────────
  {
    id: 'loc_rjy_railway',
    operatorId: 'op_railway_parking',
    name: 'Rajahmundry Junction Parking',
    address: 'Station Road, Rajahmundry Junction',
    city: 'Rajahmundry',
    district: 'East Godavari',
    pincode: '533101',
    lat: 16.9891,
    lng: 81.781,
    is24x7: true,
    contactPhone: '+918832442001',
    tags: ['cctv', 'security', 'washroom', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_rjy_rail_car',
        vehicleType: 'CAR',
        capacity: 70,
        pricing: [
          { mode: 'HOURLY', baseAmount: 25 * RUPEE, freeMinutes: 15 },
          { mode: 'DAILY', baseAmount: 150 * RUPEE },
        ],
      },
      {
        id: 'slt_rjy_rail_bike',
        vehicleType: 'BIKE',
        capacity: 210,
        pricing: [{ mode: 'HOURLY', baseAmount: 10 * RUPEE, freeMinutes: 15 }],
      },
    ],
  },
  {
    id: 'loc_rjy_pushkar_ghat',
    operatorId: 'op_ap_tourism',
    name: 'Godavari Pushkar Ghat Parking',
    address: 'Pushkar Ghat Road, Godavari riverfront',
    city: 'Rajahmundry',
    district: 'East Godavari',
    pincode: '533105',
    lat: 17.0005,
    lng: 81.788,
    openTime: '04:30',
    closeTime: '22:00',
    contactPhone: '+918832442002',
    tags: ['security', 'washroom', 'well_lit', 'wheelchair_accessible'],
    slotTypes: [
      {
        id: 'slt_rjy_ghat_car',
        vehicleType: 'CAR',
        capacity: 120,
        pricing: [{ mode: 'HOURLY', baseAmount: 20 * RUPEE, freeMinutes: 30 }],
      },
      {
        id: 'slt_rjy_ghat_bike',
        vehicleType: 'BIKE',
        capacity: 300,
        pricing: [{ mode: 'HOURLY', baseAmount: 8 * RUPEE, freeMinutes: 30 }],
      },
      {
        id: 'slt_rjy_ghat_bus',
        vehicleType: 'BUS',
        capacity: 30,
        pricing: [{ mode: 'HOURLY', baseAmount: 70 * RUPEE }],
      },
    ],
  },
  {
    id: 'loc_rjy_rtc',
    operatorId: 'op_apsrtc',
    name: 'Rajahmundry RTC Complex Parking',
    address: 'RTC Complex, Danavaipeta',
    city: 'Rajahmundry',
    district: 'East Godavari',
    pincode: '533103',
    lat: 16.994,
    lng: 81.783,
    is24x7: true,
    contactPhone: '+918832442003',
    tags: ['cctv', 'security', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_rjy_rtc_car',
        vehicleType: 'CAR',
        capacity: 50,
        pricing: [{ mode: 'HOURLY', baseAmount: 20 * RUPEE, freeMinutes: 15 }],
      },
      {
        id: 'slt_rjy_rtc_bike',
        vehicleType: 'BIKE',
        capacity: 170,
        pricing: [{ mode: 'HOURLY', baseAmount: 8 * RUPEE, freeMinutes: 15 }],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Kadapa
  // ─────────────────────────────────────────────────────────────
  {
    id: 'loc_kdp_rtc',
    operatorId: 'op_apsrtc',
    name: 'Kadapa RTC Bus Stand Parking',
    address: 'Nagarajupeta, RTC Bus Stand',
    city: 'Kadapa',
    district: 'YSR Kadapa',
    pincode: '516001',
    lat: 14.4673,
    lng: 78.8242,
    is24x7: true,
    contactPhone: '+918562242001',
    tags: ['security', 'washroom', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_kdp_rtc_car',
        vehicleType: 'CAR',
        capacity: 45,
        pricing: [
          { mode: 'HOURLY', baseAmount: 15 * RUPEE, freeMinutes: 15 },
          { mode: 'DAILY', baseAmount: 100 * RUPEE },
        ],
      },
      {
        id: 'slt_kdp_rtc_bike',
        vehicleType: 'BIKE',
        capacity: 160,
        pricing: [{ mode: 'HOURLY', baseAmount: 8 * RUPEE, freeMinutes: 15 }],
      },
    ],
  },
  {
    id: 'loc_kdp_railway',
    operatorId: 'op_railway_parking',
    name: 'Kadapa Station Parking',
    address: 'Station Road, Kadapa Railway Station',
    city: 'Kadapa',
    district: 'YSR Kadapa',
    pincode: '516002',
    lat: 14.464,
    lng: 78.81,
    is24x7: true,
    contactPhone: '+918562242002',
    tags: ['cctv', 'security', 'wheelchair_accessible'],
    slotTypes: [
      {
        id: 'slt_kdp_rail_car',
        vehicleType: 'CAR',
        capacity: 38,
        pricing: [{ mode: 'HOURLY', baseAmount: 20 * RUPEE, freeMinutes: 10 }],
      },
      {
        id: 'slt_kdp_rail_bike',
        vehicleType: 'BIKE',
        capacity: 120,
        pricing: [{ mode: 'HOURLY', baseAmount: 8 * RUPEE, freeMinutes: 10 }],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Anantapur
  // ─────────────────────────────────────────────────────────────
  {
    id: 'loc_atp_rtc',
    operatorId: 'op_apsrtc',
    name: 'Anantapur RTC Bus Stand Parking',
    address: 'Subash Road, RTC Bus Stand',
    city: 'Anantapur',
    district: 'Anantapur',
    pincode: '515001',
    lat: 14.6819,
    lng: 77.6006,
    is24x7: true,
    contactPhone: '+918554244001',
    tags: ['security', 'washroom', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_atp_rtc_car',
        vehicleType: 'CAR',
        capacity: 48,
        pricing: [
          { mode: 'HOURLY', baseAmount: 15 * RUPEE, freeMinutes: 15 },
          { mode: 'DAILY', baseAmount: 100 * RUPEE },
        ],
      },
      {
        id: 'slt_atp_rtc_bike',
        vehicleType: 'BIKE',
        capacity: 170,
        pricing: [{ mode: 'HOURLY', baseAmount: 8 * RUPEE, freeMinutes: 15 }],
      },
    ],
  },
  {
    id: 'loc_atp_clocktower',
    operatorId: 'op_smartpark',
    name: 'Clock Tower Market Parking',
    address: 'Clock Tower Circle, Anantapur',
    city: 'Anantapur',
    district: 'Anantapur',
    pincode: '515001',
    lat: 14.679,
    lng: 77.599,
    openTime: '08:00',
    closeTime: '21:00',
    contactPhone: '+918554244002',
    tags: ['well_lit'],
    slotTypes: [
      {
        id: 'slt_atp_clock_car',
        vehicleType: 'CAR',
        capacity: 22,
        pricing: [{ mode: 'HOURLY', baseAmount: 15 * RUPEE, freeMinutes: 20 }],
      },
      {
        id: 'slt_atp_clock_bike',
        vehicleType: 'BIKE',
        capacity: 95,
        pricing: [{ mode: 'HOURLY', baseAmount: 5 * RUPEE, freeMinutes: 20 }],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // Amaravati
  // ─────────────────────────────────────────────────────────────
  {
    id: 'loc_amr_secretariat',
    operatorId: 'op_smartpark',
    name: 'AP Secretariat Visitor Parking',
    address: 'Interim Government Complex, Velagapudi',
    city: 'Amaravati',
    district: 'Guntur',
    pincode: '522237',
    lat: 16.515,
    lng: 80.518,
    openTime: '07:00',
    closeTime: '21:00',
    contactPhone: '+918632445001',
    tags: ['cctv', 'security', 'ev_charging', 'wheelchair_accessible', 'well_lit'],
    slotTypes: [
      {
        id: 'slt_amr_sec_car',
        vehicleType: 'CAR',
        capacity: 150,
        pricing: [
          { mode: 'HOURLY', baseAmount: 20 * RUPEE, freeMinutes: 30 },
          { mode: 'MONTHLY', baseAmount: 1800 * RUPEE },
        ],
      },
      {
        id: 'slt_amr_sec_ev',
        vehicleType: 'EV_CAR',
        slotClass: 'EV',
        capacity: 20,
        pricing: [{ mode: 'HOURLY', baseAmount: 30 * RUPEE, freeMinutes: 15 }],
      },
      {
        id: 'slt_amr_sec_bike',
        vehicleType: 'BIKE',
        capacity: 260,
        pricing: [{ mode: 'HOURLY', baseAmount: 8 * RUPEE, freeMinutes: 30 }],
      },
    ],
  },
  {
    id: 'loc_amr_stupa',
    operatorId: 'op_ap_tourism',
    name: 'Amaravathi Stupa Parking',
    address: 'Dhanyakataka, near Amaravathi Mahachaitya',
    city: 'Amaravati',
    district: 'Guntur',
    pincode: '522020',
    lat: 16.5735,
    lng: 80.357,
    openTime: '09:00',
    closeTime: '18:00',
    contactPhone: '+918632445002',
    tags: ['washroom', 'wheelchair_accessible', 'security'],
    slotTypes: [
      {
        id: 'slt_amr_stupa_car',
        vehicleType: 'CAR',
        capacity: 36,
        pricing: [{ mode: 'HOURLY', baseAmount: 15 * RUPEE, freeMinutes: 30 }],
      },
      {
        id: 'slt_amr_stupa_bike',
        vehicleType: 'BIKE',
        capacity: 100,
        pricing: [{ mode: 'HOURLY', baseAmount: 5 * RUPEE, freeMinutes: 30 }],
      },
      {
        id: 'slt_amr_stupa_bus',
        vehicleType: 'BUS',
        capacity: 15,
        pricing: [{ mode: 'HOURLY', baseAmount: 60 * RUPEE }],
      },
    ],
  },
];

/**
 * The demo citizen.
 *
 * Fixed id and phone so apps/web can mint a demo session for it directly when
 * DEMO_AUTO_SIGN_IN is on, without going through the OTP endpoints, those are
 * rate limited per phone number, so a few server restarts would lock the demo
 * out of its own app.
 *
 * A normal CITIZEN row with no special privileges: every authorisation check
 * downstream treats it like any other account.
 */
const DEMO_USER = {
  id: 'usr_demo_citizen',
  // A reserved-looking number so it can never
  // collide with an account someone signs in with by hand.
  phone: '+919000000001',
  name: 'Demo Citizen',
  role: 'CITIZEN',
} as const;

/** A saved vehicle and a couple of favourites, so the demo dashboard has
 * something in it rather than three empty states. */
const DEMO_VEHICLES = [
  { id: 'veh_demo_car', vehicleNumber: 'AP16CX4477', vehicleType: 'CAR', label: 'Home car', isDefault: true },
  { id: 'veh_demo_bike', vehicleNumber: 'AP39BM2210', vehicleType: 'BIKE', label: 'Commute bike', isDefault: false },
] as const;

const DEMO_FAVOURITES = ['loc_knl_anand_cinema', 'loc_knl_svc_complex', 'loc_knl_rtc'];

async function main(): Promise<void> {
  await prisma.user.upsert({
    where: { id: DEMO_USER.id },
    create: { ...DEMO_USER },
    update: { phone: DEMO_USER.phone, name: DEMO_USER.name },
  });

  for (const vehicle of DEMO_VEHICLES) {
    const data = {
      userId: DEMO_USER.id,
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.vehicleType,
      label: vehicle.label,
      isDefault: vehicle.isDefault,
    };
    await prisma.vehicle.upsert({ where: { id: vehicle.id }, create: { id: vehicle.id, ...data }, update: data });
  }

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

    // Tags are a full replace, the seed file is the source of truth for them.
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

  // Favourites last: they reference locations, so they must be seeded after
  // the catalogue exists.
  for (const locationId of DEMO_FAVOURITES) {
    await prisma.favouriteLocation.upsert({
      where: { userId_locationId: { userId: DEMO_USER.id, locationId } },
      create: { userId: DEMO_USER.id, locationId },
      update: {},
    });
  }

  console.warn(
    `[seed] ${operatorCount} operators · ${locationCount} locations · ` +
      `${slotTypeCount} slot types · ${pricingCount} pricing rules · demo citizen ready`,
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
