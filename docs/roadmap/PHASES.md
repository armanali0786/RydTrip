# RideMesh — Phase-Wise Implementation Plan

Rule: **one phase at a time.** A phase is not started until the previous phase's exit
criteria are met. This document is the source of truth for what "done" means per phase.
Update the status table as work lands — do not let it drift from reality.

Stack reference: Node.js 22 LTS, TypeScript, NestJS, Prisma, PostgreSQL, Redis (+GEO),
Apache Kafka (KafkaJS), Docker, kind → EKS, Helm, Terraform, GitHub Actions, Argo CD,
Prometheus/Grafana, OpenTelemetry/Jaeger.

## Status

| # | Phase | Status | Depends on |
|---|-------|--------|------------|
| 0 | Environment + Engineering Foundation | 🟢 In progress | — |
| 1 | System Design + PRD | ⚪ Not started | 0 |
| 2 | NestJS + Microservices Foundation | ⚪ Not started | 1 |
| 3 | PostgreSQL + Prisma | ⚪ Not started | 2 |
| 4 | Docker + Local Infrastructure | ⚪ Not started | 3 |
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
- `docs/architecture/overview.md` — component diagram, request flow, ride lifecycle
- `docs/architecture/data-model.md` — riders/drivers/rides/trip_events/processed_events
- `docs/architecture/prd.md` — actors, functional requirements FR-001..FR-014
- `docs/adr/003-rest-vs-events.md` — where sync REST is used vs async Kafka events
- Sequence diagrams (Mermaid) for: ride request → dispatch → accept → trip lifecycle

Exit criteria:
- [ ] Every microservice in scope for Phases 2–7 has a one-paragraph responsibility statement
- [ ] Ride and driver state machines are fully enumerated with valid transitions only
- [ ] API contract sketch exists for Rider, Driver, Trip services (paths + verbs, no code)

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
- Each service: health endpoints `/health/live`, `/health/ready`
- Jest unit tests for state machine transition guards (invalid transitions rejected)
- Supertest integration tests for each service's HTTP surface
- OpenAPI spec per service (`@nestjs/swagger`)
- Shared `libraries/event-schema` package scaffolded (types only, not wired to Kafka yet)

Exit criteria:
- [ ] `npm run test` green across all four services
- [ ] Can manually: create rider → create driver → create trip via curl/Postman, end to end, with all four services running locally via `npm run start:dev`
- [ ] Invalid state transitions return 4xx, not 5xx

---

## Phase 3 — PostgreSQL + Prisma

**Goal:** durable storage replaces in-memory state from Phase 2.

Deliverables:
- Prisma schema: `riders`, `drivers`, `rides`, `trip_events`, `processed_events`
- Prisma Migrate initial migration
- Repository layer per service using Prisma Client (swap in-memory stores)
- Testcontainers-based integration tests (real Postgres in CI, not mocked)
- Seed script for local dev data

Exit criteria:
- [ ] All Phase 2 integration tests still pass against Postgres instead of in-memory
- [ ] A service restart does not lose data
- [ ] Migrations are reproducible from a clean database

---

## Phase 4 — Docker + Local Infrastructure

**Goal:** one command brings up the whole local stack.

Deliverables:
- Multi-stage `Dockerfile` per service (non-root user, minimal base image)
- Root `docker-compose.yml`: Postgres, all NestJS services, network wiring
- `.env.example` per service, secrets never committed

Exit criteria:
- [ ] `docker compose up` brings up every Phase 2/3 service healthy
- [ ] `docker compose down -v` cleans up with no orphaned volumes/state assumptions

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

Deliverables:
- JWT/OIDC auth at API Gateway, RBAC for rider/driver/operator roles
- Non-root containers, dropped Linux capabilities, read-only root filesystem where possible
- Kubernetes NetworkPolicies restricting cross-service traffic to what's needed
- Dependency + container image scanning wired into the build (not yet CI — that's Phase 12)
- Secrets via `.env`/local secret files locally, never committed; design ready for Secrets Manager in Phase 13

Exit criteria:
- [ ] Unauthenticated/unauthorized requests are rejected at the gateway, not deeper in the stack
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
