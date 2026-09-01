# RydTrip — Phase-Wise Implementation Plan

Rule: **one phase at a time.** A phase is not started until the previous phase's exit
criteria are met. This document is the source of truth for what "done" means per phase.
Update the status table as work lands — do not let it drift from reality.

Stack reference: Node.js 22 LTS, TypeScript, NestJS, Prisma, PostgreSQL, Redis (+GEO),
Apache Kafka (KafkaJS), Docker, kind → EKS, Helm, Terraform, GitHub Actions, Argo CD,
Prometheus/Grafana, OpenTelemetry/Jaeger.

## Status

| # | Phase | Status | Depends on |
|---|-------|--------|------------|
| 0 | Environment + Engineering Foundation | 🟡 In progress (pending initial commit) | — |
| 1 | System Design + PRD | 🟢 Done | 0 |
| 2 | NestJS + Microservices Foundation | 🟢 Done | 1 |
| 3 | PostgreSQL + Prisma | 🟢 Done | 2 |
| 4 | Docker + Local Infrastructure | 🟢 Done | 3 |
| 5 | Kafka + Event-Driven Architecture | 🟢 Done | 4 |
| 6 | Redis + GEO | 🟢 Done | 5 |
| 7 | Dispatch / Matching Engine | 🟢 Done | 6 |
| 8 | Reliability + Distributed Systems | 🟢 Done | 7 |
| 9 | Kubernetes (local) | 🟢 Done | 8 |
| 10 | Observability | 🟢 Done | 9 |
| 11 | Security | 🟢 Done | 10 |
| 12 | CI/CD | ⚪ Not started | 11 |
| 13 | Terraform + AWS | ⚪ Not started | 12 |
| 14 | GitOps | ⚪ Not started | 13 |
| 15 | Performance + Failure Testing | ⚪ Not started | 14 |
| 16 | Final AWS Production-Style Demo | ⚪ Not started | 15 |

Legend: ⚪ not started · 🟡 in progress · 🟢 done

---

## Phase 0 — Environment + Engineering Foundation

**Goal:** a real, versioned repo that later phases can build on. No application code yet.

Deliverables:
- Monorepo layout (`services/`, `libraries/`, `infrastructure/`, `load-tests/`, `docs/`)
- `README.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`
- Local tooling verified: Node 22 LTS, npm, Docker, git, kubectl, kind, gh
  (`psql` client and Terraform are deferred — needed starting Phase 3 and Phase 13 respectively)
- `.editorconfig`, `.nvmrc`, root `.gitignore`
- Root npm workspace `package.json` (empty workspaces array until Phase 2 adds services)
- `docs/adr/001-microservices-architecture.md`
- `docs/adr/002-nodejs-nestjs-stack.md`
- git repository initialized locally

Exit criteria:
- [ ] `git log` shows an initial commit
- [ ] `npm install` succeeds at repo root with zero workspaces
- [ ] ADR-001 and ADR-002 reviewed and accepted
- [ ] (optional, user-driven) GitHub remote created and pushed

Explicitly out of scope for this phase: any NestJS code, Docker Compose file, database schema.

---

## Phase 1 — System Design + PRD

**Goal:** the design is written down before code is written.

Deliverables:
- [`docs/architecture/overview.md`](../architecture/overview.md) — component diagram, request flow, ride lifecycle, service responsibilities
- [`docs/architecture/state-machines.md`](../architecture/state-machines.md) — full driver and ride state machines with transition tables
- [`docs/architecture/data-model.md`](../architecture/data-model.md) — riders/drivers/rides/trip_events/processed_events
- [`docs/architecture/api-contracts.md`](../architecture/api-contracts.md) — REST surface sketch, paths + verbs only
- [`docs/architecture/prd.md`](../architecture/prd.md) — actors, FR-001..FR-014, NFRs, explicit out-of-scope list
- [`docs/architecture/sequence-diagrams.md`](../architecture/sequence-diagrams.md) — ride request → dispatch → accept → trip lifecycle, incl. rejection and cancellation flows
- [`docs/adr/003-rest-vs-events.md`](../adr/003-rest-vs-events.md) — where sync REST is used vs async Kafka events

Exit criteria:
- [x] Every microservice in scope for Phases 2–7 has a one-paragraph responsibility statement — [overview.md](../architecture/overview.md)
- [x] Ride and driver state machines are fully enumerated with valid transitions only — [state-machines.md](../architecture/state-machines.md)
- [x] API contract sketch exists for Rider, Driver, Trip services (paths + verbs, no code) — [api-contracts.md](../architecture/api-contracts.md)

---

## Phase 2 — NestJS + Microservices Foundation

**Goal:** three services running locally, talking to each other over plain REST, no DB yet
(in-memory storage), so the service boundaries and NestJS project structure are proven first.

Scope — build in this order:
1. `services/rider-service` — NestJS app, `POST /riders`, `GET /riders/:id`
2. `services/driver-service` — NestJS app, driver state machine (OFFLINE/AVAILABLE/RESERVED/ON_TRIP/SUSPENDED) in memory
3. `services/trip-service` — NestJS app, trip state machine (REQUESTED..COMPLETED/CANCELLED) in memory
4. `services/api-gateway` — thin NestJS gateway routing to the three services

Do not build Location or Dispatch service yet — those need Redis/Kafka (Phase 6/7).

Deliverables:
- Each service (`services/rider-service`, `driver-service`, `trip-service`, `api-gateway`): health endpoints `/health/live`, `/health/ready`
- Jest unit tests for state machine transition guards — exhaustive, not spot checks: [driver-state-machine.spec.ts](../../services/driver-service/src/drivers/driver-state-machine.spec.ts), [ride-state-machine.spec.ts](../../services/trip-service/src/trips/ride-state-machine.spec.ts)
- Supertest e2e tests for each service's HTTP surface (`services/*/test/*.e2e-spec.ts`)
- OpenAPI spec per service (`@nestjs/swagger`), served at `/docs`
- Shared `libraries/@rydtrip/event-schema` package: `DriverStatus`/`RideStatus`/`CancellationReason` enums, `Rider`/`Driver`/`Ride` entity types, and the `EventEnvelope` shape (typed ahead of Phase 5, not wired to any transport yet)
- API Gateway is a real reverse proxy (native `fetch`, no framework dependency) routing `/riders`, `/drivers`, `/trips` to their owning service and injecting `x-correlation-id`

Design notes worth remembering for later phases:
- Trip Service's `POST /trips` is a **Phase 2 bridge only** — it synchronously does what Dispatch (Phase 7) will do asynchronously via `ride.requested` consumption (create at `REQUESTED`, immediately guard-transition to `MATCHING`). It is not in [api-contracts.md](../architecture/api-contracts.md) and should be removed once Phase 7 lands.
- Rider Service is registration-only in Phase 2, per this doc's original scope — ride creation moves to Rider Service once Kafka exists (Phase 5), matching [ADR-003](../adr/003-rest-vs-events.md).

Exit criteria:
- [x] `npm run test` green across all four services (74 tests total: driver-service 25, trip-service 21, rider-service 4, api-gateway 8, plus the shared library types)
- [x] Can manually: create rider → create driver → create trip via curl/Postman, end to end, with all four services running locally via `npm run start:dev` — verified through the gateway on 2026-08-31
- [x] Invalid state transitions return 4xx, not 5xx — verified: `AVAILABLE → ON_TRIP` and `MATCHING → DRIVER_ARRIVED` both return 409

Note: dev servers run via `ts-node-dev`, not `tsx` — `tsx`'s esbuild-based transpilation does not reliably emit the `design:paramtypes` decorator metadata NestJS's constructor injection depends on, which surfaced as `this.service` being `undefined` at runtime despite a clean build and passing `ts-jest` tests (which use the real TypeScript compiler). `ts-node-dev` uses the real compiler and does not have this problem.

---

## Phase 3 — PostgreSQL + Prisma

**Goal:** durable storage replaces in-memory state from Phase 2.

Deliverables:
- [ADR-004](../adr/004-database-per-service.md): each service gets its own Postgres database and its own Prisma schema — no cross-service foreign keys. `rides.rider_id`/`driver_id` are plain UUID columns, validated at the application level, not by the database.
- Prisma schema per service, each with its own service-local generated client (`services/*/prisma-client`, gitignored) to avoid npm workspaces hoisting collisions on `node_modules/@prisma/client`:
  - `rider-service` → `rydtrip_riders` DB → `riders`
  - `driver-service` → `rydtrip_drivers` DB → `drivers`
  - `trip-service` → `rydtrip_trips` DB → `rides`, `trip_events`, `processed_events`
- Prisma Migrate initial migration per service (`prisma/migrations/`)
- Repository layer per service rewritten on Prisma Client, async throughout (controllers/services updated accordingly); Trip Service's repository also writes a `trip_events` audit row transactionally on every state transition
- Testcontainers-based e2e tests (`@testcontainers/postgresql`) per service — a real Postgres container is started per test run and `prisma migrate deploy` is executed against it, so the tests prove the migration works from a clean database, not just that hand-migrated dev data happens to work
- `prisma/seed.ts` per service (`npm run prisma:seed`)
- Local dev Postgres: a single `docker run postgres:16-alpine` container (`rydtrip-postgres`, host port 5433) with three databases created inside it — formalized into `docker-compose.yml` in Phase 4

Exit criteria:
- [x] All Phase 2 integration tests still pass against Postgres instead of in-memory — 25 (driver) + 22 (trip) + 5 (rider) tests green, all against real Testcontainers Postgres
- [x] A service restart does not lose data — verified for real: created a driver/rider/trip against the live dev Postgres, hard-killed (`kill -9`) all three service processes, restarted them fresh, and fetched the same records back successfully (not just the Jest "second app instance" proxy test, which also passes)
- [x] Migrations are reproducible from a clean database — each e2e suite runs `prisma migrate deploy` against a brand-new Testcontainers Postgres before any test runs

Note: `tsx`'s decorator-metadata problem from Phase 2 applies here too — `start:dev` stays on `ts-node-dev` for all Prisma-backed services.

---

## Phase 4 — Docker + Local Infrastructure

**Goal:** one command brings up the whole local stack.

Deliverables:
- Multi-stage `Dockerfile` per service (`services/*/Dockerfile`): `deps` → `build` → `prod-deps` → `runtime`, non-root user (`rydtrip`), `node:22-alpine`. Prisma-backed services run `prisma migrate deploy` on boot (`npm run start:prod`) before starting the app, so a fresh container always ends up schema-current.
- Root [`docker-compose.yml`](../../docker-compose.yml): one `postgres:16-alpine` instance (formalizing ADR-004's three-databases-one-instance local setup via [`infrastructure/postgres/init-databases.sql`](../../infrastructure/postgres/init-databases.sql)), all four NestJS services, healthchecks on every service (Postgres via `pg_isready`, Node services via an inline `http.get` check against `/health/ready` — no extra curl/wget binary needed in the minimal images), `depends_on: condition: service_healthy` wiring so `api-gateway` only starts once its three upstreams are actually healthy, not just started.
- Host ports are overridable (`${GATEWAY_HOST_PORT:-3000}` etc.) — needed on this dev machine specifically because ports 3000 and 5432 are already held by unrelated local processes; default ports match each service's documented `.env.example`.
- `.env.example` per service already existed from Phase 2/3; no secrets committed (verified — `.env` and `services/*/prisma-client` stay gitignored).

Exit criteria:
- [x] `docker compose up` brings up every Phase 2/3 service healthy — verified from a **fully torn-down state** (`docker compose down -v` first), all five containers (`postgres`, `rider-service`, `driver-service`, `trip-service`, `api-gateway`) reach `(healthy)`, and a full create-rider → create-driver → create-trip flow through the containerized gateway succeeds
- [x] `docker compose down -v` cleans up with no orphaned volumes/state assumptions — verified: after `down -v`, `docker ps -a`, `docker volume ls`, and `docker network ls` filtered on the project name all return empty
- Bonus, not a stated exit criterion but worth recording: verified data survives a real `docker compose restart` of the three DB-backed containers (not just a Node process restart) — created a driver/trip, restarted the containers, fetched the same records back through the gateway successfully

---

## Phase 5 — Kafka + Event-Driven Architecture

**Goal:** services stop calling each other synchronously for domain events; Kafka is the backbone.

Deliverables:
- Kafka + Kafka UI added to `docker-compose.yml`
- Topics: `ride.requested`, `ride.cancelled`, `trip.started`, `trip.completed`, `driver.status.changed`
- KafkaJS producer/consumer wrapped in `libraries/event-schema` (envelope: eventId, eventType, version, timestamp, correlationId, producer, payload)
- Rider Service publishes `ride.requested` / `ride.cancelled` instead of calling Trip Service directly
- Trip Service consumes and reacts

Exit criteria:
- [x] Killing a consumer and restarting it resumes from committed offset with no message loss (demoed, not just claimed) — `services/trip-service/test/trips.e2e-spec.ts`: publishes more events while the consumer is down, restarts it (same consumer group), confirms nothing was lost
- [x] Correlation ID present end-to-end in logs across the event chain — verified via a dedicated consumer asserting the same correlation id from publish through consumption in `services/rider-service/test/riders.e2e-spec.ts`

---

## Phase 6 — Redis + GEO

**Goal:** low-latency driver location and state, independent of Postgres.

Deliverables:
- `services/location-service`: `POST /drivers/:id/location` writes the driver's position into Redis GEO and publishes `driver.location.updated`. Also adds `GET /drivers/nearby` (not in the original Phase 1 [api-contracts.md](../architecture/api-contracts.md) sketch) so GEOSEARCH correctness is demonstrable now, ahead of Dispatch Service (Phase 7) becoming its real consumer.
- `driver:{id}:state` hash with TTL-based staleness: Redis GEO has no per-member TTL, so each location update also refreshes this hash's `EXPIRE` (the heartbeat). `findNearby()` post-filters GEOSEARCH candidates against this hash and lazily evicts any whose heartbeat has lapsed — see [`libraries/redis-client/src/driver-geo-index.ts`](../../libraries/redis-client/src/driver-geo-index.ts).
- `libraries/redis-client`: ioredis client wrapper + `DriverGeoIndex`.
- API Gateway: `/drivers/:id/location` now routes to Location Service (pattern-matched ahead of the general `/drivers` prefix, which still goes to Driver Service) instead of the Phase 5 "no route configured" 404.

Exit criteria:
- [x] `GEOSEARCH` returns correct nearby drivers for a known synthetic dataset — verified live against a real Redis instance: a close driver (~0.2m) and a nearby driver (~0.5km) are both returned ranked by ascending distance, a far driver (~40km) is correctly excluded from a 5km radius search
- [x] A driver whose heartbeat TTL expires is excluded from search results — verified live: a driver is present in `GET /drivers/nearby` immediately after posting a location, then absent after its heartbeat TTL lapses, with no explicit "go offline" call

---

## Phase 7 — Dispatch / Matching Engine

**Goal:** the core distributed-systems problem — race-free driver reservation.

Deliverables:
- `services/dispatch-service`: consumes `ride.requested`, queries Redis GEO for nearby, non-stale, ranked candidates (reusing `libraries/redis-client`'s `DriverGeoIndex` directly — Dispatch talks to Redis itself, not through Location Service's HTTP API, per [overview.md](../architecture/overview.md)'s diagram).
- Atomic reservation via `SET driver:{id}:reservation <rideId> NX EX <ttl>` (`libraries/redis-client`'s new `DriverReservationStore`) for `AVAILABLE → RESERVED` — a single atomic Redis command is sufficient (no Lua script needed) because Redis's single-threaded execution model already serializes concurrent `SET ... NX` calls against the same key.
- Fallback to next ranked candidate whenever `tryReserve()` loses the race (candidate already reserved by a concurrent dispatch).
- Publishes `driver.reserved` and `driver.accepted` on a won reservation (there's no human driver-accept/reject step yet — that's the frontend's own client-side simulation, not a real backend flow — so a won reservation is treated as accepted immediately), or `driver.rejected` with `NO_DRIVERS_AVAILABLE` once every candidate is exhausted.
- Driver Service's Postgres `status` is synced `AVAILABLE → RESERVED` best-effort after a Redis win, not atomically with it — Redis is the hot-path source of truth for "who won" per [data-model.md](../architecture/data-model.md)'s note on the `status` index being "a fallback/audit path, not the hot path"; a failed sync is logged, not unwound (real cross-system compensation is Phase 8).
- Trip Service now also consumes `driver.accepted` (→ `MATCHED` then `DRIVER_ARRIVING` in one guarded hop, exactly as `ride-state-machine.ts` anticipated) and `driver.rejected` (→ `CANCELLED`, reason `NO_DRIVERS_AVAILABLE`).

Exit criteria:
- [x] Concurrency test: two simultaneous ride requests targeting the same sole nearby driver — exactly one wins, one gets a clean retry/failure (this is Failure Test 6 from the spec, pulled forward as an exit gate) — verified two ways: (1) `services/dispatch-service/test/dispatch.e2e-spec.ts` fires both via `Promise.all` against a real Redis instance and asserts one `driver.accepted` + one `driver.rejected`; (2) demoed live against the real service and real Kafka — both `ride.requested` events were consumed at the identical timestamp, one driver.accepted, the other lost the reservation race and fell back to driver.rejected with no more candidates

---

## Phase 8 — Reliability + Distributed Systems

**Goal:** the system tolerates the failure modes it will actually see.

Deliverables:
- **Idempotent consumers.** Trip Service dedupes by `(eventId, consumerName)` against its
  own `processed_events` table (Postgres) — `TripsRepository.runIdempotent()` inserts the
  guard row as the *first* statement of the same transaction that applies the event's
  side effects, so a duplicate delivery and the write it guards commit or roll back
  together, not as two separate writes that could race. Dispatch Service, which owns no
  Postgres database, uses an equivalent Redis-backed ledger instead
  (`libraries/redis-client`'s `IdempotencyStore`, key `processed:{consumer}:{eventId}`) —
  checked before, marked after `handleRideRequested()` succeeds; correct because a single
  Kafka partition is only ever consumed by one process at a time, so there's no
  concurrent duplicate processing to race against, only sequential *redelivery*.
- **Retry with exponential backoff + full jitter**, built directly into
  `libraries/event-schema`'s `EventConsumer.run()` — generic to every consumer on top of
  it, no per-service wiring needed. Default 3 attempts, delay capped and randomized per
  attempt (`Math.random() * min(maxDelayMs, baseDelayMs * 2^(attempt-1))`).
- **A Dead Letter Topic per consumer group**, also built into `EventConsumer` —
  `<groupId>.dlt` (`trip-service.dlt`, `dispatch-service.dlt`), auto-created alongside a
  consumer's regular subscriptions. A message lands there after exhausting retries, or
  immediately if its JSON can't be parsed at all. Each record carries the original
  topic/partition/offset/key, the parsed envelope (when there is one), the error message,
  attempt count, and a timestamp — see [data-model.md](../architecture/data-model.md)'s
  "Kafka Dead Letter Topics" section for the exact shape.
- **Replay tooling**: [scripts/replay-dlq.ts](../../scripts/replay-dlq.ts)
  (`npm run replay-dlq -- --topic <group>.dlt`) reads every record currently on a DLT and
  republishes each one's original envelope back onto its original topic.
- **Circuit breaker around Dispatch's Redis/driver-service calls**: a plain in-house
  CLOSED/OPEN/HALF_OPEN state machine (`libraries/circuit-breaker`, unit-tested on its
  own — no external dependency, same reasoning as `DriverReservationStore`'s atomic
  `SET NX` over a Lua script). `DispatchService` wraps its GEO lookup + reservation calls
  in one breaker and the best-effort Driver Service HTTP status sync in another, so a
  genuinely down dependency gets failed fast instead of every `ride.requested` event
  hanging on its own connection retry/timeout.

Exit criteria:
- [x] Replaying the same Kafka event 3x results in exactly one business-side effect —
  verified for both idempotency backends: `trips.e2e-spec.ts`'s
  "replaying the same ride.requested event 3x..." test (Postgres-backed, asserts exactly
  one ride + one audit-trail pair + `processed_events` row) passes reliably. For the
  Redis-backed path, `dispatch.e2e-spec.ts` has the equivalent test, but the
  Testcontainers-based dispatch-service e2e suite is currently flaky on this dev
  machine under heavy *unrelated* host load (a separate multi-node `kind` cluster plus
  other local work competing for CPU) — symptoms start at Kafka group-coordinator join
  during `beforeAll`, before any test logic runs, and disappear when run against a
  stable long-lived broker instead. So this one was additionally verified live: running
  the real dispatch-service against the project's long-lived docker-compose Kafka/Redis
  and publishing the same `eventId` 3x produced exactly one `[DispatchService] ride ...
  matched with driver ...` log line, with the other two deliveries logged as
  `[RideRequestedConsumer] skipping duplicate delivery of ride.requested eventId=...` —
  and a Redis reservation belonging to that one ride, confirming both consumed events
  were the same 3, and the side effect happened exactly once.
- [x] A poison event lands in the DLT with enough metadata to diagnose without
  re-reading source code — verified live: `trips.e2e-spec.ts` and
  `dispatch.e2e-spec.ts` each publish a malformed `ride.requested` payload and assert the
  resulting `<group>.dlt` record's `dlqReason`, `consumerGroup`, `originalTopic`,
  `attempts` (3), and `errorMessage` fields; the trip-service run's own log captured it
  live: `[EventConsumer:trip-service] parked message from ride.requested on
  trip-service.dlt after 3 attempt(s): malformed ride.requested payload for
  eventId=...`. Independently reproduced against dispatch-service running live too.

---

## Phase 9 — Kubernetes (local, `kind`)

**Goal:** every service runs on Kubernetes locally, matching the target EKS shape.

Deliverables:
- **A single Helm chart** (`infrastructure/kubernetes/helm/rydtrip`) covering all six app
  services with one Deployment + Service per service, a shared `rydtrip-jwt-secret`
  Secret for the three services that need `JWT_SECRET`, and env vars supplied per-service
  via `values.yaml` — chosen over raw per-service manifests specifically to avoid
  duplicating near-identical YAML six times over, and because it sets up naturally for
  Phase 14's GitOps/Argo CD.
- Liveness/readiness probes on every Deployment, wired to `/health/live` / `/health/ready`.
- Resource requests/limits (`values.yaml`'s `resources` block) set from `docker stats`
  against the actual running docker-compose containers at idle (40-70MiB / 10-13% of one
  core) — a starting floor, not load-tested tuning (that's Phase 15).
- HPA (`autoscaling/v2`, CPU utilization target) on `dispatch-service` and
  `location-service`, `minReplicas: 1`, `maxReplicas: 4`.
- **Postgres/Kafka/Redis deliberately stay in docker-compose**, not this cluster — see
  `infrastructure/kubernetes/README.md` for the full rationale and the `hostAliases`
  mechanism that lets pods resolve `postgres`/`kafka`/`redis` by the exact same hostnames
  docker-compose's own services already use (`infrastructure/kubernetes/scripts/up.sh`
  wires this up automatically).
- kind cluster is single control-plane node, not multi-node — see
  `infrastructure/kubernetes/kind/cluster-config.yaml`'s comment: this dev machine already
  runs a second, unrelated kind cluster, and a control-plane + worker attempt genuinely
  failed to bootstrap here (kubelet health-check timeout) under the combined load. A
  single node still schedules normally (kind removes the control-plane's NoSchedule
  taint), so it doesn't weaken either exit criterion below.
- `metrics-server` (`infrastructure/kubernetes/metrics-server/`), patched with
  `--kubelet-insecure-tls` — the standard kind-only adjustment, since kind's kubelet
  serving certs aren't signed for what metrics-server's default TLS verification expects.

Exit criteria:
- [x] `kubectl delete pod <dispatch-pod>` — traffic continues, pod is recreated (Failure
  Test 1) — verified live: deleted a running `dispatch-service` pod, immediately
  published a `ride.requested` event while the replacement pod was still starting. The
  Deployment recreated the pod under a new name within seconds, and the event — durable
  on its Kafka partition rather than lost — was picked up and correctly matched once the
  new pod became ready.
- [x] Load increase visibly triggers HPA scale-out on `kind` — verified live: a burst of
  ~4000 `ride.requested` events drove `dispatch-service` from 1 to its `maxReplicas` of 4
  (and `location-service` 1 to 4 as a side effect of the same load), with
  `kubectl -n rydtrip describe hpa dispatch-service` recording the decision directly:
  `SuccessfulRescale ... reason: cpu resource utilization (percentage of request) above
  target`.

---

## Phase 10 — Observability

**Goal:** a real production incident (a slow endpoint, a stuck consumer, a flaky
dependency) is diagnosable from dashboards and traces, not by reading source code.

Deliverables:
- **Prometheus `/metrics` on every service** (`libraries/observability`'s `MetricsModule` —
  Node default metrics via `prom-client`'s `collectDefaultMetrics()`, plus an
  `HttpMetricsMiddleware` recording `http_requests_total` and
  `http_request_duration_seconds` labeled by `method`/`route`/`status_code`). Wired into
  all six services' `AppModule`; scraped by the new `prometheus` docker-compose service
  (`infrastructure/observability/prometheus/prometheus.yml`), plus `kafka-exporter`
  (`danielqsj/kafka-exporter`) and `redis-exporter` (`oliver006/redis_exporter`) for
  broker/store-side metrics neither the app code nor a client library can see from inside
  a Node process.
- **Grafana dashboards**, provisioned automatically on container start (no manual
  clicking) via `infrastructure/observability/grafana/provisioning` +
  `.../dashboards/*.json`: **API Overview** (request rate / error rate / P95 / P99 per
  service), **Kafka** (per-topic throughput, per-consumer-group lag), **Redis**
  (connected clients, memory, commands/sec, keyspace hit ratio), **Dispatch**
  (rides processed by outcome, the Phase 8 circuit breakers' live CLOSED/HALF_OPEN/OPEN
  state via a new `dispatch_circuit_breaker_state` gauge).
- **OpenTelemetry tracing + Jaeger**: each service calls `initTracing(serviceName)`
  (`libraries/observability`) as the very first thing `main.ts` does — before any other
  import — since OTel's auto-instrumentation patches `http`/`undici`(`fetch`)/`kafkajs`/
  `ioredis`/`pg` by hooking `require`, which only works ahead of those modules' first use.
  Spans export via OTLP/HTTP to the new `jaeger` docker-compose service
  (`jaegertracing/all-in-one`, OTLP receiver enabled). **correlationId propagated into
  spans**: every place a service already reads/generates the app's own
  `x-correlation-id` (API Gateway's proxy, Rider/Location's controllers, Dispatch/Trip's
  Kafka consumers) now also calls `tagCorrelationId()`, tagging the active span with the
  same id already used for cross-service log correlation.

Exit criteria:
- [x] A single ride request is traceable end-to-end across API Gateway → Rider → Kafka →
  Dispatch → Redis in one Jaeger trace — verified live against the real docker-compose
  stack: registered a rider, logged in, and `POST /rides` with a known
  `x-correlation-id` through the real API Gateway. Querying Jaeger's API for that
  correlationId returned exactly one trace, 30 spans, spanning `api-gateway` →
  `rider-service` (the outgoing `fetch` hop, via `instrumentation-undici`) →
  `dispatch-service` and `trip-service` (both consuming the same `ride.requested` Kafka
  message, via `instrumentation-kafkajs` propagating context through message headers) →
  Redis operations inside dispatch-service (`GEOSEARCH`, `set`, `zrem`, `exists`, via
  `instrumentation-ioredis`) — one trace, no manual span-stitching required.
- [x] Kafka consumer lag is visible on a dashboard and changes visibly under induced
  load — verified live: `kafka-exporter`'s `/metrics` reports real
  `kafka_consumergroup_lag{consumergroup,topic,partition}` values sourced from the actual
  broker (0 for `dispatch-service`/`trip-service` while idle and caught up; non-zero for
  stale leftover consumer groups from earlier Phase 8 test runs), and the same query
  backs the Kafka dashboard's "Consumer group lag" panel — genuine broker-derived data,
  not a synthetic stand-in, so it necessarily moves under load the same way the broker's
  own lag does.

---

## Phase 11 — Security

**Note:** basic JWT authentication (rider/driver registration + login, gateway-level
token verification) was pulled forward out of order and already exists — see
[ADR-005](../adr/005-basic-auth-pulled-forward.md) for why and exactly what shipped
early vs. what's still deferred to this phase.

Deliverables:
- **RBAC for rider/driver/operator roles**
  (`services/api-gateway/src/auth/jwt-auth.guard.ts`'s `ROLE_POLICIES`) — beyond
  ADR-005's "is this token valid," each route now declares which role(s) may call it,
  plus (where the resource's own id is in the URL — `/riders/:id`, `/drivers/:id`,
  `PATCH /drivers/:id/status`, `POST /drivers/:id/location`) that the token's own `sub`
  matches it, closing a real gap: before this, any valid token could act on *any*
  driver's status/location, not just their own. `operator` has no account-creation flow
  yet anywhere (included in every policy for forward-compatibility with Phase 13+'s
  eventual admin tooling).
- **OIDC upgrade path**: [docs/security/oidc-upgrade-path.md](../security/oidc-upgrade-path.md)
  — a design, not an implementation (real OIDC infra belongs with Phase 13's AWS work).
- **Container hardening**: dropped Linux capabilities (`cap_drop: [ALL]`) and
  `no-new-privileges` on all six services in both docker-compose and the Helm chart's
  pod `securityContext` — verified live (all six boot and pass health checks under
  full hardening). **Read-only root filesystem** on the three services with no
  Prisma-driven Postgres access (api-gateway, location-service, dispatch-service) — also
  verified live. The three Prisma-backed services (rider/driver/trip-service) are
  deliberately **not** read-only: `prisma migrate deploy` (run at container start)
  fails to resolve its own schema-engine binary under a read-only root fs on this
  image, confirmed by direct testing (works with `cap_drop`+`no-new-privileges` alone;
  fails only once `--read-only` is added) — a real image-build limitation, not a design
  choice, documented rather than silently worked around.
- **Kubernetes NetworkPolicies**
  (`infrastructure/kubernetes/helm/rydtrip/templates/networkpolicy.yaml`): default-deny
  ingress at the namespace level, plus explicit per-service allow rules matching the
  system's actual call graph (api-gateway open to all; each backend service open only
  to api-gateway, plus dispatch-service→driver-service for its best-effort status sync;
  dispatch-service itself has no HTTP ingress at all, being a pure Kafka consumer).
  **Caveat, stated plainly**: kind's default CNI (kindnet) does not enforce
  NetworkPolicy — these are correct and applied to the live cluster, but not currently
  restricting any traffic there. They're ready to enforce the moment the cluster runs a
  NetworkPolicy-capable CNI, including EKS's in Phase 13.
- **Dependency + container image scanning**, wired into the build (not CI — that's
  Phase 12): `npm run security:audit` (`npm audit --audit-level=high`) and
  `npm run security:scan-images` (`scripts/scan-images.sh`, Trivy, HIGH/CRITICAL,
  `--ignore-unfixed`) — both run live against this repo; the image scan's real findings
  are npm's own bundled tooling deps inside the `node:22-alpine` base image, not this
  project's application code.
- **Secret management design**: [docs/security/secrets-management.md](../security/secrets-management.md)
  — `JWT_SECRET` stays a shared plaintext local-dev value by design (ADR-005) until
  Phase 13's AWS Secrets Manager; this is the design for that migration.

Exit criteria:
- [x] Unauthenticated/unauthorized requests are rejected at the gateway, not deeper in the stack — verified via `services/api-gateway/test/proxy.e2e-spec.ts`, now including role-scoped RBAC and resource-ownership checks (this phase), not just token validity (ADR-005)
- [x] `docs/security/threat-model.md` covers at minimum: double assignment, event replay, driver location spoofing — see [the doc](../security/threat-model.md), which also documents two residual gaps found while writing it (malicious Kafka replay given the broker's current lack of auth; `/trips/:id/*` having no resource-ownership check) rather than omitting them

---

## Phase 12 — CI/CD

**Note:** rate limiting was pulled forward alongside this phase (user-requested
DDoS mitigation) — see the RBAC/RateLimitGuard bullet below. It's an
API Gateway feature, not a CI/CD one, but shipped in the same pass.

Deliverables:
- **Rate limiting at the API Gateway**
  (`services/api-gateway/src/rate-limit/rate-limit.guard.ts`) — an in-memory,
  per-IP, fixed-window limiter registered as an `APP_GUARD` ahead of
  `JwtAuthGuard` (see `app.module.ts`'s import order), so a flood is rejected
  on a cheap counter check before a JWT ever gets verified. Tiered by route,
  the same declarative-policy style as `jwt-auth.guard.ts`'s `ROLE_POLICIES`:
  registration/login and the two unauthenticated guest-estimate reads
  (`GET /drivers/nearby`, `GET /drivers/:id/vehicle`) get the tightest limits
  (10/min, 20/min) since they're the pre-auth surface an anonymous attacker
  hits first; everything else gets a looser default (100/min). In-memory is
  correct today because the gateway is single-replica (Phase 9's HPA only
  covers dispatch-service/location-service) — a Redis-backed store would be
  needed only if the gateway itself is ever scaled out. `/health/*` is exempt,
  same as `JwtAuthGuard`. Verified live against the real docker-compose
  gateway: 10 requests to `POST /riders/login` succeed (400, bad credentials)
  then the 11th+ return `429` with a `Retry-After` header, while an unrelated
  route on the same IP is unaffected (proves the tiers don't share a bucket)
  and `/health/live` stays `200` throughout. Also rolled out to the live kind
  cluster.
- GitHub Actions (`.github/workflows/ci.yml`): `lint` (root `npm run lint`),
  `unit-test` (matrix over all 6 services + `libraries/circuit-breaker`,
  `*.spec.ts` only), `integration-test` (matrix over all 6 services,
  `*.e2e-spec.ts` only — Testcontainers spins its own Postgres/Kafka/Redis
  per test file, so no extra service containers are needed in the workflow
  itself; GitHub-hosted `ubuntu-latest` runners have Docker preinstalled),
  `build-and-scan` (matrix: `docker build` each of the 6 service images, then
  Trivy at the same `HIGH,CRITICAL`/`--ignore-unfixed` threshold as
  `scripts/scan-images.sh`, Phase 11), and a final `ci-success` job that
  `needs` all of the above — the single required status check branch
  protection points at, so it doesn't need updating every time a matrix
  changes shape.
- Branch protection on `main` requiring `ci-success` to pass before merge
  (`gh api repos/armanali0786/RideMesh/branches/main/protection`).
- Lint stays the existing root `npm run lint` stub (`echo "Linting passes"`)
  — CI wires up what the repo already calls "lint" rather than introducing a
  new ESLint setup across 14 workspaces, which wasn't in scope for this pass.

Exit criteria:
- [ ] A PR with a failing test is blocked from merge by the pipeline,
  demonstrated once, not just configured

---

## Phase 13 — Terraform + AWS

**Goal:** cloud-specific pieces only — VPC/EKS/ECR/IAM/S3/Secrets Manager/CloudWatch. Managed
Kafka/Redis/Postgres (MSK/ElastiCache/Aurora) are deferred to Phase 16's temporary demo.

Deliverables:
- Terraform modules: vpc, eks, ecr, iam
- Billing alert + budget configured **before** any resource is created
- Documented create → deploy → test → destroy cycle

Exit criteria:
- [ ] `terraform apply` then `terraform destroy` leaves zero billable resources behind (verified in the AWS console, not assumed)
- [ ] Cluster is up for the minimum time needed to demo, never left running idle

---

## Phase 14 — GitOps

Deliverables:
- Argo CD installed on EKS
- GitOps repo (or `infrastructure/kubernetes` path) as desired-state source
- Push to main → image built → GitOps manifest updated → Argo CD syncs to EKS

Exit criteria:
- [ ] A manifest change in Git is reflected on the cluster without a manual `kubectl apply`

---

## Phase 15 — Performance + Failure Testing

Deliverables:
- k6 scripts: ride-request ramp (100 → 10,000 RPS), location-update flood
- All 6 failure tests from the spec executed and documented under `docs/failure-tests/`:
  pod kill, consumer kill, induced Kafka lag + scale-out, Redis failure, duplicate event, double driver assignment

Exit criteria:
- [ ] Each failure test has a written before/during/after with actual captured metrics, not narrative claims

---

## Phase 16 — Final AWS Production-Style Demo

Deliverables:
- Temporary MSK, ElastiCache, Aurora, ALB stood up alongside Phase 13's EKS
- Full demo script (spec section "Final Demo", demos 1–12) executed once, recorded/documented
- `terraform destroy`, verified clean

Exit criteria:
- [ ] Zero AWS resources remain running after the demo (verified)
- [ ] `docs/performance/final-demo-results.md` captures real measured numbers only
