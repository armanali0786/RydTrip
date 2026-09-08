## What

<!-- What changed, in one or two sentences. -->

## Why

<!-- Which issue/exit criterion this addresses. -->
Closes #

## Phase / area

<!-- e.g. "Phase 13 — Terraform + AWS" or "bug fix, Phase 7 (dispatch)" -->

## How this was tested

<!-- Commands run, e.g. `npm test --workspace=services/dispatch-service`, or a manual
     docker-compose verification. Paste relevant output for anything non-obvious. -->

## Checklist

- [ ] Tests added/updated (`*.spec.ts` and/or `*.e2e-spec.ts`) — no mocked
      Postgres/Kafka/Redis in integration tests
- [ ] `npm run lint` passes
- [ ] No secrets, tokens, or real personal data added (check diffs of `.env*`, seed
      data, logs, and fixtures)
- [ ] `docs/adr/` updated if this changes an architectural decision
- [ ] `docs/roadmap/PHASES.md` checkboxes updated if this satisfies an exit criterion
