# ADR-004: Database Per Service, No Cross-Service Foreign Keys

## Context

[data-model.md](../architecture/data-model.md) (Phase 1) presents `riders`, `drivers`,
`rides`, `trip_events`, and `processed_events` as one logical ER diagram, with `rides`
holding `rider_id` and `driver_id` as foreign keys. That's the right way to describe the
*logical* data model. It is the wrong way to *physically* implement it once Rider,
Driver, and Trip Service are separate deployable services (ADR-001) — a shared database
with cross-service foreign keys would let any service reach into another's tables,
directly contradicting the service-ownership boundaries [overview.md](../architecture/overview.md)
already established. Phase 3 has to decide the physical layout before writing any
Prisma schema.

## Decision

Each service that owns durable state gets its **own Postgres database** (three separate
databases on one local Postgres instance for now — see below) and its own Prisma
schema:

| Service | Database | Tables |
|---|---|---|
| Rider Service | `rydtrip_riders` | `riders` |
| Driver Service | `rydtrip_drivers` | `drivers` |
| Trip Service | `rydtrip_trips` | `rides`, `trip_events`, `processed_events` |

`rides.rider_id` and `rides.driver_id` remain columns (plain UUIDs) but are **not**
database-level foreign keys — Rider and Driver rows live in a different database
entirely, so a DB-level FK is not even possible, which is the point. Referential
integrity across services is an application-level concern: Trip Service trusts the IDs
it's given (from Rider Service via the API Gateway, and eventually from Dispatch via
Kafka), the same way any real microservice system does.

`processed_events` is scoped to Trip Service for now because it's the only consumer
that exists. Once Dispatch Service (Phase 7) and any other Kafka consumer come online,
each gets its **own** `processed_events` table in its own database — this table is
inherently per-consumer (see [data-model.md](../architecture/data-model.md)'s composite
key rationale), not a shared one.

For local development, all three databases run on a single Postgres container
(`docker run postgres:16-alpine`, one instance, three `CREATE DATABASE` statements) —
that's a deployment convenience, not a design decision. Nothing stops each database
from moving to its own container or its own Aurora instance later; no code depends on
them sharing a server.

## Alternatives considered

- **One shared database, cross-service FKs** (what the Phase 1 ER diagram visually
  suggests): rejected — it silently reintroduces a monolith at the data layer while
  keeping the deployment complexity of microservices, the worst of both. Any service
  could bypass another's API and write directly to its tables.
- **One shared database, separate schemas per service (Postgres `schema` namespaces,
  still one physical DB)**: a lighter-weight middle ground, still rejected for the same
  reason — it's one failure domain and one point of connection-pool contention across
  all services, which undermines the "independent scaling" principle from
  [overview.md](../architecture/overview.md).

## Consequences

- Each service needs its own `DATABASE_URL`, its own `prisma/schema.prisma`, and its
  own migration history — there is no single "the" RydTrip database.
- Rider/driver existence is validated by the caller (Rider Service, via whatever
  created the ride) at write time, not enforced by the database; an ID that turns out
  to be wrong is an application bug to catch in tests, not something Postgres can catch
  for us. This is a real, accepted tradeoff of the microservices approach, not an
  oversight.
- Local dev and CI need to provision three databases, not one. Phase 3 does this with a
  single `docker run` Postgres instance (three logical databases); Phase 4's
  `docker-compose.yml` formalizes this.
