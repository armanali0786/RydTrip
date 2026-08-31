# ADR-002: Node.js 22 LTS + NestJS as the Service Stack

## Context

The project's original tech notes considered a JVM/Spring Boot stack. The current,
authoritative stack decision (reflected in the tech-stack table circulated for this
project) is Node.js 22 LTS + TypeScript + NestJS across all services, with Prisma as the
ORM. This ADR records that decision explicitly so future phases don't drift back to the
earlier assumption.

## Decision

- **Runtime**: Node.js 22 LTS
- **Language**: TypeScript
- **Framework**: NestJS (DI, module boundaries, and decorators map cleanly onto
  per-service REST + Kafka consumer/producer responsibilities)
- **ORM**: Prisma, with Prisma Migrate for schema migrations
- **Kafka client**: KafkaJS
- **Redis client**: ioredis
- **Testing**: Jest (unit), Testcontainers (integration, real Postgres/Kafka/Redis —
  not mocked), Supertest (HTTP)

## Alternatives considered

- **Java/Spring Boot**: solid fit for this problem shape, but conflicts with the
  finalized stack table for this project. Not used.
- **Express (no framework)**: less structure for a project with 6+ services sharing
  conventions (health checks, DI, module boundaries); NestJS's opinionated structure
  reduces per-service drift. NestJS chosen.
- **TypeORM instead of Prisma**: Prisma's migration workflow and generated client
  type-safety fit better for a project that will iterate on schema across many phases.
  Prisma chosen.

## Consequences

- All services in `services/` follow standard NestJS project structure.
- `libraries/event-schema` can ship as a plain TypeScript package consumed via npm
  workspaces — no cross-language schema translation needed.
- Testcontainers requires Docker to be available in CI (tracked as a Phase 12
  requirement, already true locally per Phase 0).
