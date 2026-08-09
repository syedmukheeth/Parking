# Data Model

Prisma schema design for ParkAP. Read this before touching `apps/api/prisma/schema.prisma` or writing a query.

---

## Database: Postgres from day one

Dev and prod both run **PostgreSQL**: Neon (a dev branch locally, main in prod). There is no SQLite step, so use Postgres properly. Four working rules:

### Rule 1: Real Prisma `enum`s, mirrored in `packages/shared`

```prisma
enum BookingStatus { PENDING CONFIRMED ACTIVE COMPLETED CANCELLED EXPIRED }
model Booking { status BookingStatus }
```

Mirror every enum as a Zod enum in `packages/shared` so the API boundary validates the same set the DB enforces:

```ts
export const BOOKING_STATUS = ['PENDING','CONFIRMED','ACTIVE','COMPLETED','CANCELLED','EXPIRED'] as const;
export type BookingStatus = (typeof BOOKING_STATUS)[number];
export const bookingStatusSchema = z.enum(BOOKING_STATUS);
```

DB-level enforcement **and** boundary validation: both, not one or the other. Adding an enum value is a migration; treat it as a deliberate change.

### Rule 2: Tags: a join table, not a scalar array

Postgres supports `String[]`, but `LocationTag` stays a join table because it makes `?tag=ev_charging` an **indexed** lookup rather than an array scan, and keeps the tag vocabulary a typed union.

```prisma
model LocationTag {
  locationId String
  tag        String   // LocationTag union from @parkap/shared
  location   ParkingLocation @relation(fields: [locationId], references: [id], onDelete: Cascade)
  @@id([locationId, tag])
  @@index([tag])
}
```

### Rule 3, `Json` for opaque blobs only

Provider webhook payloads and audit snapshots are `Json`: read whole, never filtered. The moment you need to query a field, promote it to a real column with an index.

### Rule 4: Migrations, always

Every schema change ships as a committed `prisma migrate` migration. Never `prisma db push` against a shared Neon branch. CI runs `migrate deploy` on a per-PR Neon branch and fails on drift.

Geo distance stays a bounding-box prefilter (indexed `lat`/`lng`) plus Haversine in JS for now; **PostGIS is a deliberate later upgrade** once volume justifies it, not something to adopt at seed scale.

---

## Entities

```
Operator ──< ParkingLocation ──< SlotType ──< Booking >── User
                   │                            │
                   ├──< PricingRule             ├──< Ticket
                   ├──< LocationTag             └──< Payment
                   └──< AvailabilitySnapshot
```

### User
Citizen or staff account. Phone is the identity, email is optional because a large share of users will not have one.

| Field | Type | Notes |
|---|---|---|
| `id` | String cuid | |
| `phone` | String | **unique**, E.164, the login identity |
| `name`, `email` | String? | optional |
| `role` | String | `CITIZEN \| OPERATOR \| ADMIN` |
| `locale` | String | `en \| te`, default `en` |
| `createdAt`, `updatedAt` | DateTime | |

Related: `Vehicle` (saved plates), `FavouriteLocation`.

### Operator
The business running one or more lots. Present from the start even though the operator dashboard is deferred, retrofitting ownership onto locations later would touch every query.

`id`, `name`, `gstin?`, `contactPhone`, `contactEmail?`, `status` (`ACTIVE | SUSPENDED`).

### ParkingLocation
A physical facility.

| Field | Type | Notes |
|---|---|---|
| `id` | String cuid | |
| `operatorId` | String | FK |
| `name`, `address`, `city`, `district`, `pincode` | String | |
| `lat`, `lng` | Float | **indexed together**, bounding-box prefilter |
| `photos` | Json | array of URLs, read whole, never filtered |
| `openTime`, `closeTime` | String | `"HH:mm"`; `"00:00"`–`"23:59"` means 24h |
| `is24x7` | Boolean | |
| `contactPhone` | String? | |
| `status` | String | `ACTIVE \| INACTIVE \| FULL` |

Times are stored as strings, not `DateTime`, because they are wall-clock daily schedules with no date component. Storing them as `DateTime` invites timezone bugs on a field that has no timezone.

### SlotType
Capacity is per vehicle class, not per location. A lot with 100 car slots and 40 bike slots is two rows.

| Field | Type | Notes |
|---|---|---|
| `locationId` | String | FK |
| `vehicleType` | String | `CAR \| BIKE \| EV_CAR \| EV_BIKE \| BUS` |
| `slotClass` | String | `GENERAL \| COVERED \| WOMEN \| DISABLED \| EV` |
| `capacity` | Int | total physical slots |

`@@unique([locationId, vehicleType, slotClass])`. Capacity lives here and nowhere else, a `totalCapacity` field on `ParkingLocation` would be a denormalisation that drifts.

### PricingRule
Resolved by the pricing engine for a requested window.

| Field | Type | Notes |
|---|---|---|
| `slotTypeId` | String | FK |
| `mode` | String | `HOURLY \| DAILY \| MONTHLY` |
| `baseAmount` | Int | **paise**, never rupees, never a float |
| `freeMinutes` | Int | grace period, default 0 |
| `dayOfWeekMask` | Int? | bitmask, null = all days |
| `startTime`, `endTime` | String? | `"HH:mm"`, null = all day |
| `priority` | Int | highest wins on overlap |
| `validFrom`, `validTo` | DateTime? | festival and seasonal windows |

**All money is integer paise.** Floating-point rupees produce off-by-one-paise reconciliation failures that are miserable to trace. This applies to every amount field in the schema.

`priority` is what lets festival and weekend pricing (Proposal Phase 2) layer over base rates without a schema change.

### Booking
The central record.

| Field | Type | Notes |
|---|---|---|
| `id` | String cuid | |
| `userId`, `locationId`, `slotTypeId` | String | FKs |
| `vehicleNumber` | String | uppercased, whitespace stripped |
| `startAt`, `endAt` | DateTime | **UTC always** |
| `status` | String | see state machine below |
| `quotedAmount` | Int | paise, locked at quote time |
| `finalAmount` | Int? | paise, after extensions |
| `holdExpiresAt` | DateTime? | mirrors the cache TTL |
| `cancelledAt`, `cancelReason` | | |

Indexes that matter:
```prisma
@@index([locationId, status, startAt, endAt])  // the capacity query
@@index([userId, createdAt])                    // booking history
```

The first index is the one the whole system's throughput rests on.

### Ticket
Issued on confirmation. Carries the QR.

`bookingId` (unique), `token` (unique, signed, single-use), `issuedAt`, `expiresAt`, `usedAt?`, `checkedInAt?`, `checkedOutAt?`, `checkedInBy?`, `checkedOutBy?`.

`usedAt` is what makes replay detectable, verification sets it in the same transaction that reads it.

### Payment
`bookingId`, `provider` (`mock | razorpay`), `providerOrderId?`, `providerPaymentId?`, `amount` (paise), `status` (`CREATED | PENDING | SUCCESS | FAILED | REFUNDED`), `rawPayload` (Json, opaque), `paidAt?`.

`rawPayload` is the audit trail. Store the provider's response verbatim: when a reconciliation dispute arrives months later, the derived fields will not be enough.

### AvailabilitySnapshot
Periodic occupancy rollup per location. Not used for booking decisions: it exists so the operator and municipal dashboards get historical occupancy charts without re-deriving them from the full booking table, and so the Phase 3 prediction model has training data from day one.

`locationId`, `slotTypeId`, `capturedAt`, `occupied`, `available`.

---

## Status enums

Each is a Prisma `enum` in `schema.prisma` **and** a mirrored Zod enum in `packages/shared` (the entity tables above show them by their value set; the storage type is the Prisma enum, not a bare `String`).

```ts
BookingStatus  PENDING | CONFIRMED | ACTIVE | COMPLETED | CANCELLED | EXPIRED
PaymentStatus  CREATED | PENDING | SUCCESS | FAILED | REFUNDED
VehicleType    CAR | BIKE | EV_CAR | EV_BIKE | BUS
SlotClass      GENERAL | COVERED | WOMEN | DISABLED | EV
UserRole       CITIZEN | OPERATOR | ADMIN
LocationStatus ACTIVE | INACTIVE | FULL
```

### Booking state machine

```
PENDING ──payment success──▶ CONFIRMED ──QR check-in──▶ ACTIVE ──QR exit──▶ COMPLETED
   │                             │
   ├──hold TTL elapsed──▶ EXPIRED│
   └──user cancels──▶ CANCELLED ◀┘
```

Legal transitions are declared as data in `booking.service.ts` and enforced centrally. No service sets `status` by direct assignment, every change goes through the transition function. Otherwise the machine becomes decorative within a month.

---

## The capacity query

The correctness core. Runs inside a transaction on every reservation.

```
available = slotType.capacity
          − count(bookings WHERE slotTypeId = ?
                             AND status IN ('CONFIRMED','ACTIVE')
                             AND startAt < requestedEnd
                             AND endAt   > requestedStart)
          − activeHolds(slotTypeId, requestedStart, requestedEnd)
```

Two details that are easy to get wrong:

- **Overlap uses strict inequality on both sides.** A booking ending exactly at 14:00 does not conflict with one starting at 14:00. Using `<=` silently halves effective capacity at every hour boundary.
- **Holds are counted from the cache, capacity from the database.** The cache can only ever make the system more conservative: a stale hold rejects a booking that could have succeeded, which is a recoverable annoyance. The reverse would be a double-booking, which is not.

Extensions re-run this check for the **added interval only**, never the whole window.

---

## Conventions

| | |
|---|---|
| Money | integer **paise**, no floats, ever |
| Timestamps | `DateTime` in **UTC**; formatting is the client's job |
| Wall-clock times | `String` `"HH:mm"`, schedules have no timezone |
| IDs | `cuid()`: sortable, non-guessable, no enumeration of bookings |
| Vehicle numbers | uppercase, whitespace stripped, at write time |
| Phone | E.164 (`+91XXXXXXXXXX`) |
| Deletes | soft via `status` for domain rows; hard deletes only through `onDelete: Cascade` on join tables |

---

## Seed data

`apps/api/prisma/seed.ts` creates realistic Andhra Pradesh locations: Tirupati temple lots, Vizag RK Beach, Vijayawada Benz Circle, Guntur, Araku, Srisailam - with plausible coordinates, capacity, pricing, and tags.

Real place names matter more than they look. Demo data reading "Test Lot 1" makes a stakeholder review about the data instead of about the product, and it hides geo bugs that only appear with genuinely spread-out coordinates.

Seed is **idempotent**, safe to re-run. `npm run db:reset` drops `dev.db` and rebuilds.

---

## Migrations & Neon workflow

1. `DATABASE_URL` points at a **Neon branch**: a personal/dev branch locally, main in prod.
2. Schema change → `prisma migrate dev --name <change>` locally, commit the migration.
3. CI runs `prisma migrate deploy` against a per-PR Neon branch; drift fails the build.
4. Prod release runs `prisma migrate deploy` as a step before the app starts, never `migrate dev`.

Later performance work, once real volume justifies it (not now):
- PostGIS for geo queries, replacing bbox+Haversine
- partial indexes on active bookings
- read replicas / Neon read pooling for dashboard-heavy reads
