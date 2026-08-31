# Data Model

PostgreSQL is the durable source of truth for business data (Phase 3 implements this
via Prisma). Redis (Phase 6) and Kafka (Phase 5) hold no durable business state.

**Physical ownership**: this document describes the logical entities and their
relationships. Physically, each table lives in the database owned by the service that
writes it — there is no single shared database and no cross-service foreign keys. See
[ADR-004](../adr/004-database-per-service.md) for the full rationale and the exact
service → database → table mapping.

## Entity relationship diagram

```mermaid
erDiagram
    RIDERS ||--o{ RIDES : requests
    DRIVERS ||--o{ RIDES : fulfills
    RIDES ||--o{ TRIP_EVENTS : "has history"

    RIDERS {
        uuid id PK
        text name
        text phone
        text email
        text password_hash
        timestamptz created_at
        timestamptz updated_at
    }
    DRIVERS {
        uuid id PK
        text name
        text phone
        text email
        text password_hash
        text vehicle_type
        text status
        timestamptz created_at
        timestamptz updated_at
    }
    RIDES {
        uuid id PK
        uuid rider_id FK
        uuid driver_id FK
        double pickup_lat
        double pickup_lng
        double destination_lat
        double destination_lng
        text status
        text cancellation_reason
        timestamptz created_at
        timestamptz updated_at
    }
    TRIP_EVENTS {
        uuid id PK
        uuid ride_id FK
        text event_type
        uuid event_id
        timestamptz timestamp
        jsonb metadata
    }
    PROCESSED_EVENTS {
        uuid event_id PK
        text consumer_name PK
        timestamptz processed_at
    }
```

## Tables

### `riders`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `name` | text | not null |
| `phone` | text | not null, unique |
| `email` | text | not null, unique (ADR-005) |
| `password_hash` | text | not null, bcrypt (ADR-005) — never returned by any endpoint |
| `created_at` | timestamptz | not null, default now() |
| `updated_at` | timestamptz | not null, default now() |

### `drivers`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | not null |
| `phone` | text | not null, unique |
| `email` | text | not null, unique (ADR-005) |
| `password_hash` | text | not null, bcrypt (ADR-005) — never returned by any endpoint |
| `vehicle_type` | text | not null |
| `status` | text | not null, one of the driver state machine states, default `OFFLINE` |
| `created_at` | timestamptz | not null, default now() |
| `updated_at` | timestamptz | not null, default now() |

Index: `(status)` — Dispatch/operator queries filter by status; primary availability
lookups still go through Redis GEO (Phase 6), not this index. This is a fallback/audit
path, not the hot path.

### `rides`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `rider_id` | uuid | FK → `riders.id`, not null |
| `driver_id` | uuid | FK → `drivers.id`, nullable (unset until `MATCHED`) |
| `pickup_lat` / `pickup_lng` | double precision | not null |
| `destination_lat` / `destination_lng` | double precision | not null |
| `status` | text | not null, one of the ride state machine states |
| `cancellation_reason` | text | nullable, set only when `status = CANCELLED` |
| `created_at` | timestamptz | not null, default now() |
| `updated_at` | timestamptz | not null, default now() |

Indexes: `(rider_id, created_at)` for ride history queries; `(driver_id)` for a
driver's active/past rides; `(status)` for operator dashboards.

`rides` holds **current state only**. It is not an event log — that's `trip_events`.

### `trip_events`

Append-only audit trail of every state transition and significant domain event tied to
a ride. Exists separately from `rides` so the current-state row stays cheap to read
while still preserving full history for debugging, replay, and the DLT investigation
workflow (Phase 8).

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `ride_id` | uuid | FK → `rides.id`, not null |
| `event_type` | text | not null (e.g. `ride.requested`, `driver.accepted`, `trip.completed`) |
| `event_id` | uuid | not null — the Kafka event envelope's `eventId`, for cross-referencing |
| `timestamp` | timestamptz | not null |
| `metadata` | jsonb | event-specific payload (candidate driver list, cancellation reason, etc.) |

Index: `(ride_id, timestamp)` for reconstructing a ride's full history in order.

### `processed_events`

Idempotency ledger. Every consumer checks this table before applying an event's side
effects, and writes to it in the same transaction as those side effects (Phase 8).

| Column | Type | Constraints |
|---|---|---|
| `event_id` | uuid | part of composite PK |
| `consumer_name` | text | part of composite PK — same event may be legitimately processed once per consumer group |
| `processed_at` | timestamptz | not null, default now() |

Composite primary key `(event_id, consumer_name)` is what makes a duplicate delivery a
no-op: a second insert attempt for the same pair fails the uniqueness constraint, and
the consumer treats that as "already handled."

## Redis key space (Phase 6/7 — not durable, holds no business state)

Owned per-service, same rule as Postgres (ADR-004) applied to Redis keys instead of tables.

| Key | Owner | Purpose |
|---|---|---|
| `drivers:geo` | Location Service (writes), Dispatch Service (reads) | GEO sorted set of driver positions |
| `driver:{id}:state` | Location Service | Hash of `lat`/`lng`/`updatedAt`; its `EXPIRE` is the heartbeat — gone means stale |
| `driver:{id}:reservation` | Dispatch Service | `SET ... NX EX` reservation lock; value is the `rideId` that holds it |

## What's deliberately not modeled yet

Payments, ratings, ride pooling, surge pricing, and multi-region sharding are out of
scope for the MVP (see [prd.md](prd.md)) and have no tables here. Don't add speculative
columns for them.
