# Changelog

All notable changes to this project are documented in this file.

## [1.0.0] - 2026-09-04

First stable release of **RydTrip** — a production-grade, real-time distributed ride-hailing and dispatch platform built on an event-driven microservices architecture.

### Core Platform & Microservices
- Introduced `api-gateway`, `rider-service`, `driver-service`, and `trip-service`, each with its own PostgreSQL database and Prisma schema.
- Added `location-service` as the sole writer of driver location into Redis GEO, exposing `POST /drivers/:id/location` and publishing driver-location events.
- Added `dispatch-service`, consuming `ride.requested` events and ranking nearby driver candidates via Redis GEO for atomic driver reservation under concurrency.
- Built a real dispatch → accept → trip lifecycle, including driver online/offline sync.
- Added rider pickup OTP verification required before a driver can start a trip.

### Event-Driven Architecture
- Implemented a Kafka-based event backbone (KafkaJS producer/consumer wrapper, envelope-based publisher, explicit topic pre-creation to avoid KRaft single-broker leader-election races).
- Added idempotent consumers, retry-with-backoff, per-consumer-group Dead Letter Topics, and a circuit breaker to close the at-least-once delivery gap.

### Frontend
- Delivered rider and driver web apps (`apps/rider-web`, `apps/driver-web`, `apps/web`) with booking, profile, and real booking-history views.
- Added guest browsing on the rider booking flow, auto-detected current location, and an OpenStreetMap-based map view as a Google Maps alternative.
- Implemented login/auth with protected routes for both riders and drivers.

### Security
- Added RBAC and resource-ownership checks across services.
- Added API Gateway rate limiting, documented in the threat model.

### Infrastructure & DevOps
- Added a multi-stage Dockerfile per service (non-root user, minimal Alpine base, pruned production dependencies) and a root `docker-compose.yml` wiring Postgres, Kafka, and all services with health checks.
- Added a single Helm chart (`infrastructure/kubernetes/helm/rydtrip`) deploying all app services to a local kind cluster.
- Added a CI/CD pipeline (GitHub Actions), building shared libraries before running tests.

### Observability
- Added observability instrumentation across all services and actions.

### Documentation
- Added architecture diagrams, a service-call sequence diagram, and an expanded README with visual showcase and screenshots.
