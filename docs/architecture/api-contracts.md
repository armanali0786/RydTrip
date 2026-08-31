# API Contract Sketch

Paths and verbs only — no request/response code, no implementation. This is the Phase 1
contract that Phase 2 implements literally. All paths are versioned under `/api/v1` and
sit behind the API Gateway.

## API Gateway routing

| Path prefix | Routes to |
|---|---|
| `/api/v1/riders`, `/api/v1/rides` | Rider Service |
| `/api/v1/drivers/*/status` | Driver Service |
| `/api/v1/drivers/*/location` | Location Service (Phase 6+; until then, no-op) |
| `/api/v1/trips` | Trip Service |

Every request gets a `correlationId` injected by the Gateway if the client didn't
supply one, per the event envelope defined in [ADR-003](../adr/003-rest-vs-events.md).

## Rider Service

| Method | Path | Purpose | Key response fields |
|---|---|---|---|
| `POST` | `/riders` | Register a rider | `id`, `name`, `phone` |
| `GET` | `/riders/{riderId}` | Fetch rider profile | rider fields |
| `POST` | `/rides` | Request a ride | `rideId`, `status` (`MATCHING`) — returns immediately, does not wait for a match |
| `GET` | `/rides/{rideId}` | Fetch current ride status | ride fields incl. `status`, `driverId` if matched |
| `GET` | `/riders/{riderId}/rides` | Ride history | list of ride summaries |
| `POST` | `/rides/{rideId}/cancel` | Cancel a ride | updated `status`, rejected with `409` if ride is already `IN_PROGRESS`/terminal |

## Driver Service

| Method | Path | Purpose | Key response fields |
|---|---|---|---|
| `POST` | `/drivers` | Register a driver | `id`, `name`, `phone`, `vehicleType`, `status` (`OFFLINE`) |
| `GET` | `/drivers/{driverId}` | Fetch driver profile | driver fields |
| `PATCH` | `/drivers/{driverId}/status` | Explicit status transition (online/offline/suspend/reinstate) | updated `status`; `409` on an invalid transition (see [state-machines.md](state-machines.md)) |

Reservation/acceptance transitions (`AVAILABLE → RESERVED → ON_TRIP`) are **not**
triggered by a direct client call — they're driven by Dispatch Service reacting to
Kafka events (Phase 7), not exposed as a public endpoint.

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
| `401` / `403` | Missing/invalid auth, or insufficient role (enforced starting Phase 11) |

## Health endpoints (every service)

`GET /health/live`, `GET /health/ready` — no auth required, used by Kubernetes probes
starting Phase 9.
