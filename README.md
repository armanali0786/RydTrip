# 🚕 RideMesh

Cost-optimized, real-time distributed ride dispatch platform — built locally first
(₹0 out-of-pocket), with AWS used only for controlled, temporary cloud demonstrations.

## What this is

A production-style backend system covering the distributed-systems problems found in
ride-hailing platforms: event-driven microservices, low-latency geo-matching, atomic
driver reservation under concurrency, Kafka-based reliability patterns, Kubernetes
scaling, and a full CI/CD + GitOps + observability stack.

This is **not** a CRUD demo. See [`docs/roadmap/PHASES.md`](docs/roadmap/PHASES.md) for
why each piece exists and in what order it gets built.

## Build order

The project is implemented **one phase at a time** — see
[`docs/roadmap/PHASES.md`](docs/roadmap/PHASES.md) for the full plan, current status,
and exit criteria for every phase. Do not skip ahead; each phase's exit criteria are the
gate for starting the next.

| Phase | Focus |
|---|---|
| 0 | Environment + engineering foundation *(current)* |
| 1 | System design + PRD |
| 2 | NestJS + microservices foundation |
| 3 | PostgreSQL + Prisma |
| 4 | Docker + local infrastructure |
| 5 | Kafka + event-driven architecture |
| 6 | Redis + GEO |
| 7 | Dispatch / matching engine |
| 8 | Reliability + distributed systems |
| 9 | Kubernetes (local) |
| 10 | Observability |
| 11 | Security |
| 12 | CI/CD |
| 13 | Terraform + AWS |
| 14 | GitOps |
| 15 | Performance + failure testing |
| 16 | Final AWS production-style demo |

## Stack

Node.js 22 LTS · TypeScript · NestJS · Prisma · PostgreSQL · Redis (+ GEO) · Apache Kafka
(KafkaJS) · Docker · Kubernetes (kind → EKS) · Helm · Terraform · GitHub Actions ·
Argo CD · Prometheus/Grafana · OpenTelemetry/Jaeger · Jest/Testcontainers/Supertest/k6.

## Repository layout

```text
services/           NestJS microservices (added starting Phase 2)
libraries/           shared packages: event-schema, observability, security
infrastructure/      terraform/ and kubernetes/ (helm charts, argocd manifests)
load-tests/          k6 scripts
docs/
  architecture/      system design, data model, PRD
  adr/               architecture decision records
  roadmap/           PHASES.md — the phase-wise implementation plan
  diagrams/          Mermaid/exported diagrams
  performance/       load test results
  failure-tests/     chaos test write-ups
  security/          threat model, security notes
```

## Cost philosophy

Everything through Phase 12 runs entirely locally at ₹0. AWS is introduced in Phase 13
for cloud-native pieces only (VPC/EKS/ECR/IAM), and managed Kafka/Redis/Postgres
(MSK/ElastiCache/Aurora) are stood up only for the temporary Phase 16 demo, then
destroyed. Nothing billable is left running between sessions.

## Getting started

Phase 0 is environment setup only — no application code yet. See
[`docs/roadmap/PHASES.md`](docs/roadmap/PHASES.md#phase-0--environment--engineering-foundation)
for the exact deliverables and exit criteria.

## License

See [`LICENSE`](LICENSE).
