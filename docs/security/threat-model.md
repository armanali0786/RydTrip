# Threat Model (Phase 11)

Scope: the threats specific to this project's own design decisions — the concurrent
driver-matching race, an event-driven architecture built on a broker with no
authentication of its own, and driver-submitted location data. Generic web threats
(SQLi, XSS, CSRF) aren't covered here; they're addressed by the frameworks in use
(Prisma's parameterized queries, React's escaping, JWT bearer auth having no cookie/CSRF
surface) rather than needing a bespoke mitigation.

## 1. Double assignment (two riders' events reserving the same driver)

**Threat**: two `ride.requested` events for different rides both select the same nearby
driver as their top candidate (a plausible, not rare, scenario under real concurrent
demand) and both attempt to reserve them. Without a guard, both could succeed, assigning
one driver to two riders simultaneously.

**Mitigation**: `DriverReservationStore.tryReserve()`
(`libraries/redis-client/src/driver-reservation-store.ts`) uses Redis `SET ... NX` — an
atomic compare-and-set the Redis single-threaded execution model guarantees can only
succeed for one caller. `DispatchService.handleRideRequested()` treats a failed
reservation as "try the next candidate," not an error. This was Phase 7's exit
criterion, verified under real concurrent load in `dispatch.e2e-spec.ts`.

**Residual risk**: none identified within Redis's own consistency model. The one
adjacent risk is Redis itself becoming unavailable — mitigated separately by Phase 8's
circuit breaker around this exact call (`DispatchService`'s `redisBreaker`), which fails
the whole reservation attempt fast rather than reserving without the atomic guard.

## 2. Event replay

Two distinct sub-threats share this name:

**2a. Legitimate redelivery** (Kafka's own at-least-once delivery, a consumer restart
replaying uncommitted offsets, or Phase 8's retry-with-backoff itself): the same
`eventId` gets handled more than once. **Mitigation**: idempotency, Phase 8 — Trip
Service's `processed_events` table (same transaction as the side effect it guards) and
Dispatch Service's Redis-backed `IdempotencyStore`, both keyed on `(eventId,
consumerName)`. Verified in both services' e2e suites by publishing the same `eventId`
three times and asserting exactly one side effect.

**2b. Malicious replay** (an attacker with network access to the Kafka broker captures
and re-publishes a legitimate message verbatim, or crafts a new one with an arbitrary
`eventId` and payload): idempotency by `eventId` does **not** defend against this — a
replayed message with a *new*, never-seen `eventId` is indistinguishable from a genuine
event to every consumer. **Residual risk, unmitigated today**: the Kafka broker
(`docker-compose.yml`'s `kafka` service) runs with `KAFKA_LISTENER_SECURITY_PROTOCOL_MAP:
... PLAINTEXT` — no authentication, no ACLs, no encryption. Anyone with network access to
port 9092/9094 can publish or consume anything. This is an accepted local-dev posture
(same reasoning as `JWT_SECRET`'s plaintext default — see
[secrets-management.md](secrets-management.md)), but is a genuine gap that Phase 13's
managed Kafka (MSK) needs to close with IAM-based authentication and TLS in transit
before this system handles anything real.

## 3. Driver location spoofing

**Threat A — wrong actor, right shape**: a driver's client (or a compromised/malicious
one impersonating a driver) posts fabricated GPS coordinates to claim proximity to a
lucrative ride, or posts on another driver's behalf entirely.

**Mitigation**: this phase's RBAC ownership check
(`services/api-gateway/src/auth/jwt-auth.guard.ts`'s `ROLE_POLICIES` with
`ownIdGroup`) requires `POST /drivers/:id/location`'s `:id` to equal the calling
token's own `sub` — a driver can update *their own* location, never another driver's.
Before this phase, any valid token (even a rider's) could call this endpoint for any
driver id at all.

**Threat B — right actor, implausible data**: a genuine, authenticated driver posts
coordinates that are physically implausible given their last known position and the
time elapsed (teleportation, or a speed no vehicle achieves) — RBAC's ownership check
doesn't and can't catch this, since the request is legitimately from that driver's own
token.

**Residual risk, unmitigated today**: `LocationsService.updateLocation()`
(`services/location-service/src/locations/locations.service.ts`) accepts and stores
whatever `lat`/`lng` it's given, with no plausibility check against the driver's
previous position (which the same service already has — `DriverGeoIndex.upsertLocation`
overwrites without reading the prior value first). A real mitigation would compute
distance-since-last-update against elapsed time and reject or flag anomalies exceeding a
generous speed threshold; not implemented, since Phase 6/7's scope was correctness of
the GEO index itself, not anti-spoofing. Worth doing before this ever carries real
driver-earnings implications.

## 4. Volumetric abuse (credential stuffing, scraping, request floods)

**Threat**: an attacker with no valid token hammers the pre-auth surface
(`POST /riders`, `POST /riders/login`, `POST /drivers`, `POST /drivers/login`,
and the two guest-estimate reads `GET /drivers/nearby` / `GET /drivers/:id/vehicle`)
— credential stuffing against login, account-enumeration via registration's
conflict response, scraping driver locations, or simply a volumetric flood
aimed at exhausting gateway/downstream capacity.

**Mitigation** (Phase 12): `RateLimitGuard`
(`services/api-gateway/src/rate-limit/rate-limit.guard.ts`), an `APP_GUARD`
registered ahead of `JwtAuthGuard`, so a flood is rejected on a cheap
in-memory per-IP counter check before a JWT is ever verified. The pre-auth
surface above gets the tightest limits (10-20 requests/min); everything else
gets a looser default (100/min). Verified live: 10 requests to
`POST /riders/login` succeed, the 11th+ return `429` with `Retry-After`.

**Residual risk**: this defends the application layer, not the network layer
— a distributed flood (many source IPs, or one behind a spoofed/rotating
`X-Forwarded-For` if `trust proxy` is ever misconfigured beyond the single
hop it's set for) isn't stopped by a per-IP counter alone. Real DDoS
mitigation at scale is an infrastructure concern (AWS Shield / CloudFront in
front of the ALB, Phase 13+), not something an application-level guard can
fully substitute for. Also unmitigated: the counters are in-memory and
per-process, so they reset on a gateway restart and don't survive/aggregate
across replicas — acceptable today since the gateway is single-instance
(Phase 9's HPA doesn't cover it), but would need a Redis-backed store the
moment it does.

## 5. Resource ownership gaps RBAC does not close (called out for completeness)

RBAC (this phase) checks *role* everywhere, and *identity-vs-path-param* ownership
specifically for `/riders/:id`, `/drivers/:id`, `PATCH /drivers/:id/status`, and
`POST /drivers/:id/location` — anywhere the resource's own id is directly in the URL.
`/trips/:id/*` routes do **not** get an ownership check: the gateway has no domain
schema of its own (by design — see `proxy.controller.ts`) to look up which
rider/driver a given trip id belongs to. A rider or driver with a valid token can view
or act on **any** trip if they know or guess its id. Trip ids are random UUIDs
(practically unguessable), so this is a low-likelihood, not a zero, risk — closing it
properly means either the gateway gaining a trip-ownership lookup (against Trip
Service, adding the domain coupling the gateway currently avoids) or trip-service doing
the check itself. Not fixed in this phase; flagged here rather than left silently
undocumented.
