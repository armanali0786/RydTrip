# Secrets Management (Phase 11 design, Phase 13 implementation)

## Current state

Every secret in this project is `JWT_SECRET`, and it's a shared plaintext value
(`dev-shared-secret-change-me`) in three places:

- `docker-compose.yml`'s `${JWT_SECRET:-dev-shared-secret-change-me}` for
  rider-service, driver-service, and api-gateway.
- `infrastructure/kubernetes/helm/rydtrip/values.yaml`'s `jwtSecret`, materialized as
  a Kubernetes `Secret` (`rydtrip-jwt-secret`) by `templates/secret.yaml` — already a
  `Secret` object rather than a plain env var in the chart, but its *value* still comes
  from a plaintext `values.yaml` default, not a real secret store.
- Each service's local `.env` for `start:dev`.

This is a deliberate, documented choice (ADR-005) for local dev, not an oversight — but
it's also explicitly the thing this phase is supposed to have a real design ready to
replace, per PHASES.md's Phase 11 deliverable.

## Target: AWS Secrets Manager (Phase 13)

- **One secret per environment**, not per service — `rydtrip/{env}/jwt-secret` — since
  today it's the same value shared by design across rider-service, driver-service, and
  the gateway (verifying a token signed by any of them). If OIDC (see
  [oidc-upgrade-path.md](oidc-upgrade-path.md)) removes the shared-secret verification
  path entirely, this secret is retired outright rather than migrated.
- **Rotation**: Secrets Manager's automatic rotation, on a schedule, via a small
  rotation Lambda that writes the new value and (during the overlap window) accepts
  both old and new — mirrors the OIDC doc's own "dual-accept during a transition
  window" pattern, so the gateway's JWT verification logic already needs to support
  "check against either of two current values" for that reason regardless.
- **Runtime access**: ECS task definitions (or EKS pod service accounts via IRSA)
  reference the secret ARN directly — the secret's plaintext value never appears in
  Terraform state, an env var visible via `docker inspect`/`kubectl describe`, or a
  CI log, all of which the current `dev-shared-secret-change-me` value *does* appear
  in today by design (it's meant to be visible and disposable for local dev).
- **Local dev stays as-is**: the plaintext shared value in `docker-compose.yml` /
  `values.yaml` remains the local-dev path even after Phase 13 ships Secrets Manager for
  real environments — there's no reason to require AWS credentials just to run
  `docker compose up` on a laptop. `SECURITY.md` already documents this value as a
  known, intentional local-only default; that note stays accurate rather than becoming
  stale.

## Why not sooner

Secrets Manager is an AWS-specific service — using it before Phase 13's Terraform/AWS
groundwork exists would mean either standing up AWS access just for this one secret (a
real cost/complexity jump for a project that's been entirely free-tier/local so far,
per the project's own cost philosophy — see `RideMap`'s free OSM tiles, this session's
free Nominatim geocoding) or building throwaway plumbing that gets replaced in Phase 13
anyway. This phase's job is the design, not the infra.

## What changes in code, later (Phase 13)

- Each service's `main.ts` (or a shared `libraries/observability`-style
  `libraries/secrets` package) fetches `JWT_SECRET` from Secrets Manager at boot
  instead of reading `process.env.JWT_SECRET` — a few lines behind an interface, not a
  rearchitecture, since every current call site already just wants "the current
  string value."
- `infrastructure/kubernetes/helm/rydtrip/templates/secret.yaml` is replaced by (or
  supplemented with) the AWS Secrets and Configuration Provider (ASCP) for the
  Secrets Store CSI Driver, so the Kubernetes `Secret` object is itself sourced from
  Secrets Manager rather than a Helm value.
