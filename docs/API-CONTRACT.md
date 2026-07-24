# API Contract

REST and WebSocket surface of the ParkAP API. Every request and response shape here has a matching Zod schema in `packages/shared` — that package is the source of truth, this document is the readable version of it.

**Base URL (dev):** `http://localhost:4000`
**Content type:** `application/json`
**Auth:** Better Auth session — httpOnly cookie from the browser; the web server forwards the verified session token to the api on protected routes. The api verifies, never issues.

---

## Conventions

- Money is **integer paise** in every field. `amount: 4000` means ₹40.00.
- Timestamps are **ISO 8601 UTC** (`2026-07-24T09:30:00.000Z`). Local formatting is the client's job.
- Wall-clock times are `"HH:mm"` strings.
- IDs are cuids.
- Lists are paginated with `?page` (1-based) and `?limit` (default 20, max 100).

### Envelope

Success responses return the payload directly. Errors always take this shape:

```json
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "No slots available for the selected time",
    "details": { "available": 0 }
  }
}
```

`code` is a stable machine-readable string — clients branch on it. `message` is human-readable and may change. Stack traces are never returned.

### Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Body or query failed schema validation; `details` lists fields |
| `UNAUTHENTICATED` | 401 | Missing, malformed, or expired token |
| `FORBIDDEN` | 403 | Authenticated but wrong role or not the owner |
| `NOT_FOUND` | 404 | Resource does not exist |
| `OTP_INVALID` | 400 | Wrong or expired OTP |
| `OTP_RATE_LIMITED` | 429 | Too many OTP requests for this phone |
| `SLOT_UNAVAILABLE` | 409 | Capacity check failed for the requested window |
| `HOLD_EXPIRED` | 409 | Reservation hold elapsed before payment completed |
| `INVALID_TRANSITION` | 409 | Illegal booking state change |
| `TICKET_ALREADY_USED` | 409 | QR replay attempt |
| `TICKET_EXPIRED` | 409 | QR presented outside its validity window |
| `PAYMENT_FAILED` | 402 | Provider declined |
| `RATE_LIMITED` | 429 | Generic throttle |
| `INTERNAL` | 500 | Unhandled; correlation id in `details.requestId` |

---

## Auth

Auth is owned by **Better Auth in `apps/web`**, not by NestJS. The phone-OTP sign-in and session issuance happen on the web side; the session lives in an **httpOnly cookie**. `apps/api` receives the forwarded session token, verifies it in a `SessionGuard`, and applies RBAC — it does not issue or refresh sessions itself.

The routes below describe the **web-side Better Auth surface** (paths approximate Better Auth's conventions) plus the shapes the api sees. Treat request/response bodies as the contract; exact Better Auth paths are finalised in Phase 3.

### `POST /api/auth/request-otp` *(web / Better Auth)*
*(was `POST /auth/request-otp`)*

```json
{ "phone": "+919876543210" }
```
```json
{ "requestId": "otp_c1x...", "expiresInSeconds": 300 }
```

Rate limited per phone and per IP. In development the `StubOtpProvider` logs the code to the API console; it is never included in the response body.

### `POST /auth/verify-otp`

```json
{ "requestId": "otp_c1x...", "code": "123456" }
```
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id": "usr_...", "phone": "+919876543210", "name": null, "role": "CITIZEN", "locale": "en" }
}
```

New phone numbers are registered on first successful verification — there is no separate signup.

### `POST /auth/refresh`
`{ "refreshToken": "..." }` → new token pair.

### `GET /auth/me` 🔒
Current user.

### `PATCH /auth/me` 🔒
`{ "name"?, "email"?, "locale"? }`

---

## Locations

### `GET /locations`

Search and filter. Public.

| Query | Type | Notes |
|---|---|---|
| `q` | string | name, address, city, landmark |
| `lat`, `lng` | float | required for distance sort |
| `radiusKm` | float | default 5, max 50 |
| `vehicleType` | enum | `CAR \| BIKE \| EV_CAR \| EV_BIKE \| BUS` |
| `slotClass` | enum | `GENERAL \| COVERED \| WOMEN \| DISABLED \| EV` |
| `tags` | csv | e.g. `cctv,ev_charging` |
| `openNow` | boolean | evaluated against server time |
| `availableOnly` | boolean | hides full lots |
| `sort` | enum | `distance \| price \| availability`, default `distance` |

```json
{
  "items": [{
    "id": "loc_...",
    "name": "Tirumala Main Parking",
    "address": "Tirumala, Tirupati",
    "city": "Tirupati",
    "lat": 13.6833, "lng": 79.3474,
    "distanceKm": 1.4,
    "walkingMinutes": 17,
    "photos": ["https://..."],
    "is24x7": true,
    "openTime": "00:00", "closeTime": "23:59",
    "status": "ACTIVE",
    "tags": ["cctv", "security", "ev_charging"],
    "priceFrom": 2000,
    "availability": { "total": 140, "available": 37 }
  }],
  "page": 1, "limit": 20, "total": 6
}
```

`priceFrom` is the cheapest hourly rate across the location's slot types — enough for a results card, not a quote. Never price a booking from it.

Distance is a bounding-box prefilter in SQL followed by Haversine in JS. `distanceKm` and `walkingMinutes` are omitted when `lat`/`lng` are absent.

### `GET /locations/:id`

Full detail — everything above plus per-slot-type capacity and pricing:

```json
{
  "id": "loc_...",
  "name": "Tirumala Main Parking",
  "contactPhone": "+91...",
  "slotTypes": [{
    "id": "slt_...",
    "vehicleType": "CAR",
    "slotClass": "GENERAL",
    "capacity": 100,
    "available": 23,
    "pricing": [
      { "mode": "HOURLY", "baseAmount": 2000, "freeMinutes": 15 },
      { "mode": "DAILY",  "baseAmount": 15000, "freeMinutes": 0 }
    ]
  }]
}
```

### `GET /locations/:id/availability`

Lightweight polling fallback for clients without a working socket.

```json
{
  "locationId": "loc_...",
  "updatedAt": "2026-07-24T09:30:00.000Z",
  "slotTypes": [{ "slotTypeId": "slt_...", "capacity": 100, "occupied": 77, "available": 23 }]
}
```

Computed from the database, not the cache — this endpoint is the reconciliation path.

---

## Bookings

### `POST /bookings/quote` 🔒

Price a window without reserving anything. No state is created.

```json
{ "locationId": "loc_...", "slotTypeId": "slt_...", "startAt": "...", "endAt": "...", "vehicleType": "CAR" }
```
```json
{
  "amount": 6000,
  "currency": "INR",
  "breakdown": [
    { "label": "Hourly ×3", "amount": 6000 },
    { "label": "First 15 min free", "amount": 0 }
  ],
  "available": 23,
  "quoteExpiresAt": "2026-07-24T09:35:00.000Z"
}
```

### `POST /bookings` 🔒

Create a booking, acquire a hold, and open a payment order. This is the reservation entry point.

```json
{
  "locationId": "loc_...",
  "slotTypeId": "slt_...",
  "startAt": "...", "endAt": "...",
  "vehicleNumber": "AP39AB1234",
  "vehicleType": "CAR"
}
```
```json
{
  "booking": {
    "id": "bkg_...",
    "status": "PENDING",
    "startAt": "...", "endAt": "...",
    "quotedAmount": 6000,
    "holdExpiresAt": "2026-07-24T09:40:00.000Z"
  },
  "payment": { "id": "pay_...", "provider": "mock", "providerOrderId": "order_...", "amount": 6000, "status": "CREATED" }
}
```

Returns `409 SLOT_UNAVAILABLE` when the transactional capacity check fails. Clients must handle this even when the availability shown a moment earlier was non-zero — that number is advisory, and the race is real.

### `GET /bookings/me` 🔒
`?status=` and `?upcoming=true` filters. Newest first.

### `GET /bookings/:id` 🔒
Owner or operator of the location only, else `403 FORBIDDEN`. Includes nested `payment` and `ticket`.

### `POST /bookings/:id/cancel` 🔒
`{ "reason"?: "..." }` → booking with `status: "CANCELLED"`.
Legal from `PENDING` and `CONFIRMED`. From `ACTIVE` or later returns `409 INVALID_TRANSITION`.

### `POST /bookings/:id/extend` 🔒

```json
{ "newEndAt": "2026-07-24T14:00:00.000Z" }
```
```json
{
  "booking": { "id": "bkg_...", "endAt": "...", "finalAmount": 8000 },
  "payment": { "id": "pay_...", "amount": 2000, "status": "CREATED" }
}
```

Capacity is re-checked for the **added interval only**. Extension can legitimately fail with `409 SLOT_UNAVAILABLE` when the slot is booked by someone else later — the UI must present that as a normal outcome, not an error state.

---

## Tickets

### `GET /tickets/:bookingId/qr` 🔒
```json
{ "token": "tkt_...", "qrDataUrl": "data:image/png;base64,...", "expiresAt": "..." }
```

### `POST /tickets/verify` 🔒 `OPERATOR`

Gate check-in. Booking moves `CONFIRMED → ACTIVE`.

```json
{ "token": "tkt_..." }
```
```json
{
  "ok": true,
  "booking": { "id": "bkg_...", "status": "ACTIVE", "vehicleNumber": "AP39AB1234", "endAt": "..." },
  "location": { "id": "loc_...", "name": "Tirumala Main Parking" }
}
```

Read and mark-used happen in one transaction. Replay returns `409 TICKET_ALREADY_USED`; a token outside its window returns `409 TICKET_EXPIRED`.

### `POST /tickets/exit` 🔒 `OPERATOR`

Check-out. `ACTIVE → COMPLETED`. Returns overstay charges when the vehicle exits after `endAt`:

```json
{ "ok": true, "booking": { "status": "COMPLETED" }, "overstay": { "minutes": 25, "amount": 2000 } }
```

---

## Payments

### `POST /payments/:id/confirm` 🔒 *(mock provider only)*
Development shortcut to simulate a successful payment. Registered only when `PAYMENT_PROVIDER=mock`.

### `POST /payments/webhook`
Public, signature-verified. Payload shaped like Razorpay's so the real adapter is a drop-in.

On success: `Payment → SUCCESS`, `Booking PENDING → CONFIRMED`, ticket issued, hold released, availability delta emitted.
On failure: `Payment → FAILED`, hold released, booking left to expire.

Handling is **idempotent by `providerPaymentId`** — gateways retry webhooks, and a non-idempotent handler will double-issue tickets.

---

## WebSocket

Socket.IO at the API origin, namespace `/realtime`.

### Client → server
| Event | Payload |
|---|---|
| `subscribe:location` | `{ locationId }` |
| `unsubscribe:location` | `{ locationId }` |

### Server → client
| Event | Payload | When |
|---|---|---|
| `availability:snapshot` | `{ locationId, updatedAt, slotTypes: [...] }` | On subscribe and on reconnect |
| `availability:delta` | `{ locationId, slotTypeId, available, occupied }` | Booking confirmed/cancelled, check-in, check-out |
| `booking:updated` | `{ bookingId, status }` | Own bookings, authenticated sockets only |

`availability:snapshot` is computed from the database and is how cache drift self-heals — clients replace local state on snapshot rather than merging it.

**The cached counter is advisory.** Never gate a booking attempt on it client-side; let `POST /bookings` decide.

---

## Rate limits

| Route | Limit |
|---|---|
| `POST /auth/request-otp` | 3 / 15 min per phone, 10 / hour per IP |
| `POST /auth/verify-otp` | 5 / 15 min per requestId |
| `POST /bookings` | 10 / min per user |
| Everything else | 100 / min per IP |

Exceeding returns `429` with `Retry-After`.
