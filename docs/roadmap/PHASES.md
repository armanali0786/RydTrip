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
| 5 | Kafka + Event-Driven Architecture | ⚪ Not started | 4 |
| 6 | Redis + GEO | ⚪ Not started | 5 |
| 7 | Dispatch / Matching Engine | ⚪ Not started | 6 |
| 8 | Reliability + Distributed Systems | ⚪ Not started | 7 |
| 9 | Kubernetes (local) | ⚪ Not started | 8 |
| 10 | Observability | ⚪ Not started | 9 |
| 11 | Security | ⚪ Not started | 10 |
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
- [ ] Killing a consumer and restarting it resumes from committed offset with no message loss (demoed, not just claimed)
- [ ] Correlation ID present end-to-end in logs across the event chain

---

## Phase 6 — Redis + GEO

**Goal:** low-latency driver location and state, independent of Postgres.

Deliverables:
- `services/location-service`: `POST /drivers/:id/location`, writes to Redis GEO + publishes `driver.location.updated`
- `driver:{id}:state` hash with TTL-based staleness (heartbeat expiry → STALE)
- ioredis client wrapper in `libraries/observability` or a new `libraries/redis-client`

Exit criteria:
- [ ] `GEOSEARCH` returns correct nearby drivers for a known synthetic dataset
- [ ] A driver whose heartbeat TTL expires is excluded from search results

---

## Phase 7 — Dispatch / Matching Engine

**Goal:** the core distributed-systems problem — race-free driver reservation.

Deliverables:
- `services/dispatch-service`: consumes `ride.requested`, queries Redis GEO, filters by availability, ranks candidates
- Atomic reservation (Lua script or `SET ... NX` pattern) for `AVAILABLE → RESERVED`
- Fallback to next candidate on reservation failure
- Publishes `driver.reserved` / `driver.accepted` / `driver.rejected`

Exit criteria:
- [ ] Concurrency test: two simultaneous ride requests targeting the same sole nearby driver — exactly one wins, one gets a clean retry/failure (this is Failure Test 6 from the spec, pulled forward as an exit gate)

---

## Phase 8 — Reliability + Distributed Systems

**Goal:** the system tolerates the failure modes it will actually see.

Deliverables:
- Idempotent consumers via `processed_events` table (dedupe by eventId)
- Retry with exponential backoff + jitter on transient failures
- Dead Letter Topic per consumer group + replay tooling
- Circuit breaker around Redis/Postgres calls from Dispatch

Exit criteria:
- [ ] Replaying the same Kafka event 3x results in exactly one business-side effect
- [ ] A poison event lands in the DLT with enough metadata to diagnose without re-reading source code

---

## Phase 9 — Kubernetes (local, `kind`)

**Goal:** every service runs on Kubernetes locally, matching the target EKS shape.

Deliverables:
- Deployment/Service/ConfigMap/Secret manifests (or Helm chart) per service
- Liveness/readiness probes wired to `/health/live`, `/health/ready`
- Resource requests/limits set from observed local usage, not guessed
- HPA on dispatch-service and location-service

Exit criteria:
- [ ] `kubectl delete pod <dispatch-pod>` — traffic continues, pod is recreated (Failure Test 1)
- [ ] Load increase visibly triggers HPA scale-out on `kind`

---

## Phase 10 — Observability

Deliverables:
- Prometheus scraping `/metrics` from every service
- Grafana dashboards: API (rate/error/P95/P99), Kafka (throughput/lag), Redis, Dispatch
- OpenTelemetry tracing + Jaeger, correlationId propagated into spans

Exit criteria:
- [ ] A single ride request is traceable end-to-end across API Gateway → Rider → Kafka → Dispatch → Redis in one Jaeger trace
- [ ] Kafka consumer lag is visible on a dashboard and changes visibly under induced load

---

## Phase 11 — Security

**Note:** basic JWT authentication (rider/driver registration + login, gateway-level
token verification) was pulled forward out of order and already exists — see
[ADR-005](../adr/005-basic-auth-pulled-forward.md) for why and exactly what shipped
early vs. what's still deferred to this phase.

Deliverables:
- RBAC for rider/driver/operator roles (ADR-005 only checks "is this token valid",
  not "is this role allowed to call this route")
- OIDC upgrade path for the auth pulled forward in ADR-005
- Non-root containers, dropped Linux capabilities, read-only root filesystem where possible
- Kubernetes NetworkPolicies restricting cross-service traffic to what's needed
- Dependency + container image scanning wired into the build (not yet CI — that's Phase 12)
- Real secret management for `JWT_SECRET` and friends (still a shared plaintext
  local-dev value per ADR-005); design ready for Secrets Manager in Phase 13

Exit criteria:
- [x] Unauthenticated/unauthorized requests are rejected at the gateway, not deeper in the stack — verified via `services/api-gateway/test/proxy.e2e-spec.ts` (ADR-005); role-scoped RBAC enforcement is still open
- [ ] `docs/security/threat-model.md` covers at minimum: double assignment, event replay, driver location spoofing

---

## Phase 12 — CI/CD

Deliverables:
- GitHub Actions: lint, unit test, integration test (Testcontainers), Docker build, image scan
- Branch protection requiring the pipeline to pass

Exit criteria:
- [ ] A PR with a failing test is blocked from merge by the pipeline, demonstrated once, not just configured

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
