# Contributing to RydTrip

Thanks for considering a contribution. RydTrip is a phase-by-phase distributed-systems
learning project — [`docs/roadmap/PHASES.md`](docs/roadmap/PHASES.md) is the source of
truth for what's built, what's in progress, and what's next. Read the status table there
before opening an issue or PR so your change lands in the right place.

## Ground rules

1. **Respect phase order.** Don't add Terraform (Phase 13) before Phase 12's exit
   criteria are met, don't reach for Argo CD (Phase 14) before Phase 13, etc. Check
   [PHASES.md](docs/roadmap/PHASES.md)'s status table first.
2. **No feature for resume-appeal.** Kafka, Redis, Kubernetes, Terraform, etc. are used
   because the architecture requires them at that phase, not because they sound good.
3. **Every ADR-worthy decision gets an ADR** under [`docs/adr/`](docs/adr/), using the
   Context / Decision / Alternatives / Consequences structure already in use there.
4. **Tests are real.** Integration tests use Testcontainers against real
   Postgres/Kafka/Redis, not mocks — see ADR-002 and existing `*.e2e-spec.ts` files for
   the pattern.
5. **Never commit secrets.** `.env` files are gitignored; add new config to the
   relevant service's `.env.example` (shape only, no real values) instead.
6. **No PII or fabricated production data.** This is a demo project — don't add seed
   data, fixtures, or examples that look like real rider/driver personal information.

## Local setup

Requires:
- Node.js 22 LTS (see `.nvmrc`) — `nvm use`
- Docker + Docker Compose
- `gh` CLI (optional, for issues/PRs from the terminal)

```bash
npm install                # installs all workspaces (services/*, libraries/*, apps/*)
cp services/<name>/.env.example services/<name>/.env   # per service you're touching
docker compose up          # brings up Postgres, Kafka, Redis, and every service
```

Each service exposes `/health/live` and `/health/ready`; the API Gateway proxies
`/riders`, `/drivers`, `/trips`, etc. on port 3000 (see the README's architecture
diagram for the full call graph).

## Finding something to work on

- Check [PHASES.md](docs/roadmap/PHASES.md) for the current phase (🟡) and its
  remaining exit criteria — that's the highest-priority work.
- Browse [open issues](https://github.com/armanali0786/RydTrip/issues), especially
  those labeled `good first issue` or `help wanted`.
- Bug fixes, test gaps, and doc corrections in already-🟢 phases are always welcome
  and don't need to wait on phase order.
- Don't see an issue for what you want to work on? Open one first (see
  [Filing an issue](#filing-an-issue)) and let a maintainer weigh in before you invest
  time in a PR — this avoids duplicate or wasted work on a solo-paced roadmap.

## Making changes

1. Fork the repo (or branch directly if you have write access) —
   `git checkout -b <type>/<short-description>`, e.g. `fix/dispatch-race-on-retry` or
   `docs/adr-006-oidc`.
2. Keep PRs small and focused on one issue or exit criterion. A phase's worth of work
   is expected to land as several PRs, not one.
3. Write or update tests alongside the change — unit tests (`*.spec.ts`) for logic,
   `*.e2e-spec.ts` (Testcontainers) for anything crossing a service boundary.
4. Run locally before opening the PR:
   ```bash
   npm run lint
   npm test --workspace=<affected-workspace>
   ```
5. If the change touches an architectural decision (new datastore, new communication
   pattern, a reversed prior decision), add an ADR under `docs/adr/` in the same PR.
6. Update [PHASES.md](docs/roadmap/PHASES.md)'s exit criteria checkboxes if your PR
   satisfies one — don't let the doc drift from reality.

## Opening the pull request

- Reference the issue it closes (`Closes #123`).
- Describe what changed and, for anything non-obvious, why — the PR template will
  prompt you.
- CI (`.github/workflows/ci.yml`) runs lint, unit tests, Testcontainers integration
  tests, and an image build + Trivy scan on every PR; the `ci-success` check must be
  green before merge.
- One maintainer review/approval is required before merging to `main`.

## Filing an issue

See **[Creating tickets / issues](#creating-tickets--issues-for-contributors)** below —
the short version: use a GitHub issue template, be specific about which phase or
exit criterion it relates to, and include repro steps for bugs.

## Reporting security issues

Do not open a public issue for a security vulnerability — see [`SECURITY.md`](SECURITY.md).

## Code of conduct

Be respectful and constructive. Disagreement about technical approach is fine and
expected; personal attacks, harassment, or bad-faith reviews are not.
