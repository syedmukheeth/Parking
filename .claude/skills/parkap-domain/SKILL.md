---
name: parkap-domain
description: ParkAP domain model, ubiquitous language, invariants, and the packages/shared contract — the DDD reference for what the words mean and which rules can never be violated. Use when modeling data, naming things, writing a Zod schema/DTO, or deciding whether an operation is legal.
---

# ParkAP Domain

The domain layer's source of truth. Read `../../../docs/DATA-MODEL.md` for schema detail; this is the DDD lens on top.

## Ubiquitous language

Use these exact words in code, schemas, and conversation. Don't invent synonyms.

| Term | Means |
|---|---|
| **Operator** | Business running one or more lots. Owns locations. |
| **ParkingLocation** | One physical facility. |
| **SlotType** | Capacity bucket = (location, vehicleType, slotClass). Capacity lives here, nowhere else. |
| **Booking** | A citizen's reservation of a SlotType for a time window. The aggregate root. |
| **Hold** | Short-TTL claim in the cache preventing double-booking during payment. Not a DB row's job. |
| **Ticket** | Signed, single-use QR issued on confirmation; drives gate check-in/out. |
| **Payment** | A provider transaction against a Booking. |
| **Quote** | A priced window with no state created. |

Never say "spot"/"space" for SlotType, "order" for Booking, "pass" for Ticket.

## Aggregates & boundaries

- **Booking is the aggregate root** for the reservation lifecycle. Ticket and Payment are inside its consistency boundary — created and transitioned via booking rules, not independently.
- **Location/SlotType/PricingRule** is a separate aggregate (the catalog). Bookings reference it by id; they don't mutate it.
- Cross-aggregate change is eventual, via events/jobs (e.g. a confirmed booking emits an availability delta), never a single giant transaction across both.

## Invariants (can never be false)

1. A SlotType's confirmed+active overlapping bookings never exceed its capacity. (Enforced by the transactional capacity check, strict inequality on both bounds.)
2. Money is a non-negative integer in **paise**.
3. Times are UTC; a booking's `endAt > startAt`.
4. A Ticket is used at most once (`usedAt` set in the same tx that reads it).
5. Booking status changes only along legal transitions.
6. A Payment's success is the only thing that moves a Booking `PENDING → CONFIRMED`.
7. A Booking belongs to exactly one User and one SlotType.

If code could make one of these false, it's a bug regardless of what a test says.

## State machine

```
PENDING ──payment success──▶ CONFIRMED ──check-in──▶ ACTIVE ──check-out──▶ COMPLETED
   │                             │
   ├──hold TTL elapsed──▶ EXPIRED│
   └──user cancels──▶ CANCELLED ◀┘  (cancel legal from PENDING, CONFIRMED only)
```

Transitions declared as data in `booking.state-machine.ts`; every change routes through the transition function. No direct `status =` assignment anywhere.

## The shared contract (`packages/shared`)

Every status union, DTO, filter, and error code is defined here once as a **Zod schema + inferred type**:

```ts
export const BOOKING_STATUS = ['PENDING','CONFIRMED','ACTIVE','COMPLETED','CANCELLED','EXPIRED'] as const;
export type BookingStatus = (typeof BOOKING_STATUS)[number];
export const bookingStatusSchema = z.enum(BOOKING_STATUS);
```

Mirror each in the Prisma schema as a real Postgres `enum` (Neon = Postgres from day one). api validates inbound with the Zod schema; web types fetches with the inferred type. **A type defined in two places is a bug.**

## Value objects worth their own type

`Paise` (branded int), `PhoneE164`, `VehicleNumber` (uppercased, trimmed at construction), `TimeWindow` (start/end with `end>start` enforced), `HHmm` (wall-clock schedule string). Construct-time validation means invalid values can't exist downstream.

## Enums

```
BookingStatus  PENDING|CONFIRMED|ACTIVE|COMPLETED|CANCELLED|EXPIRED
PaymentStatus  CREATED|PENDING|SUCCESS|FAILED|REFUNDED
VehicleType    CAR|BIKE|EV_CAR|EV_BIKE|BUS
SlotClass      GENERAL|COVERED|WOMEN|DISABLED|EV
UserRole       CITIZEN|OPERATOR|ADMIN
LocationStatus ACTIVE|INACTIVE|FULL
```
