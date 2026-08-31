# ADR-001: Microservices Architecture

## Context

RideMesh models the distributed-systems problems of a ride-hailing platform: ride
lifecycle management, high-frequency driver location ingestion, proximity-based
matching under concurrency, and independent scaling needs per workload. A monolith
would hide exactly the problems this project exists to demonstrate — independent
scaling, failure isolation, and event-driven coordination.

## Decision

Build as independently deployable microservices, introduced incrementally rather than
all at once:

1. Rider Service, Driver Service, Trip Service, API Gateway (Phase 2)
2. Location Service (Phase 6, once Redis exists)
3. Dispatch Service (Phase 7, once Redis GEO + Kafka exist)
4. Notification / Analytics Service (later, optional — not required for core demo)

Services communicate synchronously (REST) only where a request needs an immediate
answer, and asynchronously (Kafka) for domain events and anything that shouldn't block
an HTTP response.

## Alternatives considered

- **Modular monolith**: faster to build, but hides the scaling/failure-isolation
  problems this project is meant to demonstrate. Rejected.
- **All 8 services from day one**: violates the project's own build-order rule
  (see [`docs/roadmap/PHASES.md`](../roadmap/PHASES.md)); adds coordination overhead
  before there's anything to coordinate. Rejected.

## Consequences

- Requires an event envelope, idempotent consumers, and DLT handling earlier than a
  monolith would (addressed in Phase 5/8).
- Cross-service integration testing needs Testcontainers rather than in-process calls.
- Each service gets its own health checks, resource limits, and HPA policy in Phase 9.
