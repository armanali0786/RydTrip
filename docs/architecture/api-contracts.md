# API Contract Sketch

Paths and verbs only — no request/response code, no implementation. This is the Phase 1
contract that Phase 2 implements literally. All paths are versioned under `/api/v1` and
sit behind the API Gateway.

## API Gateway routing

| Path prefix | Routes to |
|---|---|
| `/api/v1/riders`, `/api/v1/rides` | Rider Service |
| `/api/v1/drivers/*/status` | Driver Service |
| `/api/v1/drivers/*/location` | Location Service (Phase 6) |
| `/api/v1/trips` | Trip Service |

Every request gets a `correlationId` injected by the Gateway if the client didn't
supply one, per the event envelope defined in [ADR-003](../adr/003-rest-vs-events.md).

## Rider Service

| Method | Path | Purpose | Key response fields |
|---|---|---|---|
| `POST` | `/riders` | Register a rider (requires `email` + `password`, ADR-005) | `id`, `name`, `phone`, `email` |
| `POST` | `/riders/login` | Log in with `identifier` (email or phone) + `password` (ADR-005) | `accessToken`, rider fields |
| `GET` | `/riders/{riderId}` | Fetch rider profile | rider fields |
| `POST` | `/rides` | Request a ride | `rideId`, `status` (`MATCHING`) — returns immediately, does not wait for a match |
| `GET` | `/rides/{rideId}` | Fetch current ride status | ride fields incl. `status`, `driverId` if matched |
| `GET` | `/riders/{riderId}/rides` | Ride history | list of ride summaries |
| `POST` | `/rides/{rideId}/cancel` | Cancel a ride | updated `status`, rejected with `409` if ride is already `IN_PROGRESS`/terminal |

## Driver Service

| Method | Path | Purpose | Key response fields |
|---|---|---|---|
| `POST` | `/drivers` | Register a driver (requires `email` + `password`, ADR-005) | `id`, `name`, `phone`, `email`, `vehicleType`, `status` (`OFFLINE`) |
| `POST` | `/drivers/login` | Log in with `identifier` (email or phone) + `password` (ADR-005) | `accessToken`, driver fields |
| `GET` | `/drivers/{driverId}` | Fetch driver profile | driver fields |
| `PATCH` | `/drivers/{driverId}/status` | Explicit status transition (online/offline/suspend/reinstate) | updated `status`; `409` on an invalid transition (see [state-machines.md](state-machines.md)) |

Reservation/acceptance transitions (`AVAILABLE → RESERVED → ON_TRIP`) are **not**
triggered by a direct client call — they're driven by Dispatch Service reacting to
Kafka events (Phase 7), not exposed as a public endpoint.

## Location Service (Phase 6)

Not in the original Phase 1 sketch — Redis GEO didn't exist yet. Owns the only Redis
GEO writes; holds no Postgres data of its own (see [overview.md](overview.md)).

| Method | Path | Purpose | Key response fields |
|---|---|---|---|
| `POST` | `/drivers/{driverId}/location` | Driver location ping — writes Redis GEO + refreshes the heartbeat TTL, publishes `driver.location.updated` | `driverId`, `status` (`ACCEPTED`) — returns immediately |
| `GET` | `/drivers/nearby` | Nearby drivers via `GEOSEARCH`, ranked by distance (added to demonstrate the Phase 6 exit criteria) | list of `{ driverId, lat, lng, distanceKm }`, ascending by distance |

## Dispatch Service (Phase 7)

Holds **no public HTTP API** — it's a pure Kafka consumer/producer (`ride.requested` in;
`driver.reserved` / `driver.accepted` / `driver.rejected` out). It talks to Redis directly
using the same `libraries/redis-client` `DriverGeoIndex` Location Service uses, rather than
calling `GET /drivers/nearby` over HTTP — see [overview.md](overview.md). Only a health
endpoint exists (`GET /health/live`, `GET /health/ready`).

## Trip Service

| Method | Path | Purpose | Key response fields |
|---|---|---|---|
| `GET` | `/trips/{rideId}` | Fetch full trip state + history | current `status`, `trip_events` timeline |
| `POST` | `/trips/{rideId}/driver-arrived` | Driver marks arrival at pickup | updated `status` (`DRIVER_ARRIVED`) |
| `POST` | `/trips/{rideId}/start` | Rider boards, trip begins | updated `status` (`IN_PROGRESS`) |
| `POST` | `/trips/{rideId}/complete` | Trip ends | updated `status` (`COMPLETED`) |

Every endpoint here enforces the ride state machine: a call that doesn't match a valid
transition from the current state returns `409 Conflict`, not `500`.

## Common error shape (applies to every service)

| Status | When |
|---|---|
| `400` | Malformed/invalid request body |
| `404` | Referenced entity (rider/driver/ride) doesn't exist |
| `409` | Requested transition is not valid from the entity's current state |
| `429` | Rate limit exceeded (Gateway-enforced) |
| `401` | Missing/invalid/expired bearer token (enforced at the Gateway since ADR-005) |
| `403` | Valid token, insufficient role (RBAC — Phase 11, not yet enforced) |

## Health endpoints (every service)

`GET /health/live`, `GET /health/ready` — no auth required, used by Kubernetes probes
starting Phase 9.
