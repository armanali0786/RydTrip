# Contributing

RydTrip is built phase by phase — see [`docs/roadmap/PHASES.md`](docs/roadmap/PHASES.md)
before opening any change. A few ground rules:

1. **Respect phase order.** Don't add Kubernetes manifests before Phase 9, don't reach
   for Terraform before Phase 13, etc. If a phase's exit criteria aren't met, the next
   phase doesn't start.
2. **No feature for resume-appeal.** Kafka, Redis, Kubernetes, etc. are used because the
   architecture requires them at that phase, not because they sound good. See spec
   Rules 4–5 in the project vision.
3. **Every ADR-worthy decision gets an ADR** under `docs/adr/`, using the
   Context / Decision / Alternatives / Consequences structure.
4. **Tests are real.** Integration tests use Testcontainers against real
   Postgres/Kafka/Redis, not mocks — see ADR-002 and the Phase 3 exit criteria.
5. **Never commit secrets.** `.env` files are gitignored; use `.env.example` for shape
   only.

## Local setup

Requires Node.js 22 LTS (see `.nvmrc`), Docker, and (from Phase 3 onward) a Postgres
client. Run `npm install` at the repo root once services exist (Phase 2+).
