# ADR-003: REST vs. Kafka Events — Where the Boundary Sits

## Context

With six services planned across Phases 2–7, ad hoc decisions about "should this call
be a REST call or a Kafka event" would produce an inconsistent, hard-to-reason-about
system. This needs one clear rule, decided once, in Phase 1, before any inter-service
call is written.

## Decision

**Use REST (synchronous)** when a client or caller is waiting for an immediate,
specific answer, and the work behind that answer is bounded and fast:

- Client-facing requests: register rider/driver, fetch ride/trip status, ride history
- Direct state-machine actions with an immediate result: `PATCH /drivers/{id}/status`,
  `POST /trips/{id}/driver-arrived`, `.../start`, `.../complete`
- Anything the API Gateway routes straight through to one owning service

**Use Kafka (asynchronous)** when:

- The work has variable, potentially long duration and must not hold an HTTP
  connection open — matching (`ride.requested` → Dispatch) is the canonical example
- More than one service needs to react to the same fact (e.g. `driver.status.changed`
  is relevant to Dispatch and, later, Analytics)
- The event must survive a consumer being temporarily down — anything Dispatch,
  Location, or Trip Service reacts to as a domain fact rather than answers directly

Concretely: `ride.requested`, `ride.cancelled`, `driver.location.updated`,
`driver.status.changed`, `driver.reserved`, `driver.accepted`, `driver.rejected`,
`trip.started`, `trip.completed` are all events, per [overview.md](../architecture/overview.md).

## Rule of thumb

> If the caller needs the answer to decide what to show the user *right now*, it's
> REST. If the "answer" is really "downstream systems should know this happened,"
> it's an event.

## Alternatives considered

- **Pure event-driven, no REST**: rejected — a rider client needs an immediate
  acknowledgment (`rideId`, initial status) synchronously; forcing that through an
  async round-trip adds complexity with no benefit.
- **Pure REST / synchronous orchestration** (e.g. Rider Service calls Dispatch
  Service directly and blocks until matched): rejected — matching duration is
  variable and can involve multiple candidate retries (see
  [state-machines.md](../architecture/state-machines.md)); blocking an HTTP request
  on that is exactly the anti-pattern this architecture exists to avoid.

## Consequences

- `POST /rides` returns `202 Accepted` with `status: MATCHING`, not a final match
  result — clients must poll `GET /rides/{id}` or (a future, unscheduled phase) use a
  WebSocket/SSE channel for live updates.
- Every event needs the envelope defined in `docs/roadmap/PHASES.md` Phase 5
  (`eventId`, `eventType`, `version`, `timestamp`, `correlationId`, `producer`,
  `payload`) so idempotency (FR-012) and tracing (Phase 10) work uniformly.
- Trip Service becomes the single source of truth for ride status specifically
  *because* multiple producers (Rider Service, Dispatch Service) emit events that
  affect it — a synchronous model would have made this ownership ambiguous.
