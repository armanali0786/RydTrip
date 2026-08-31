# ADR-005: Basic Authentication Pulled Forward from Phase 11

## Context

The frontend (`apps/web`) shipped ahead of any real backend identity: `useAuthStore`
hardcoded two fake users (`rider_arman_01`, `driver_rahul_01`) and a role-switcher
instead of a login, and `RidersController`/`DriversController` had no credential
concept at all — `Rider`/`Driver` had no password field. Every "logged in" session
was fake, and a chunk of the UI (ride creation, the driver dashboard) depended
directly on those hardcoded identities.

[`PHASES.md`](../roadmap/PHASES.md) schedules JWT/OIDC auth as part of **Phase 11 —
Security**, gated behind Phases 6–10 (Redis, Dispatch, Reliability, Kubernetes,
Observability). Waiting until Phase 11 to remove the fake users was considered, but
rejected: it would mean shipping several more phases of features before a rider or
driver could actually sign in as themselves, and the fake-identity dependency would
only get more entangled with each phase built on top of it.

## Decision

Pull a **minimal, real** login/registration flow forward, out of phase order, as a
deliberate and documented exception — not a reinterpretation of Phase 11:

- `Rider`/`Driver` gain `email` (unique) and `passwordHash` (bcrypt via
  `bcryptjs`) columns.
- `POST /riders` and `POST /drivers` now require `email` + `password` and hash
  the password before storage; `POST /riders/login` / `POST /drivers/login`
  take an `identifier` (email *or* phone, looked up with an `OR` query) +
  `password`, verify credentials, and return a JWT (`@nestjs/jwt`) signed with
  a secret shared across rider-service, driver-service, and api-gateway
  (`JWT_SECRET`, same insecure local-dev default in every `.env.example`, per
  [SECURITY.md](../../SECURITY.md)).
- API Gateway verifies the JWT on every route except registration/login/health, per
  its existing "owns authentication" responsibility in
  [overview.md](../architecture/overview.md), and forwards the verified identity
  downstream as `x-user-id`/`x-user-role` headers.

**Explicitly still deferred to Phase 11**, not delivered here:

- RBAC (role-scoped route authorization beyond "any valid token")
- OIDC / external identity provider
- Per-service JWT verification / short-lived + refresh tokens
- Kubernetes NetworkPolicies, dependency/image scanning, Secrets Manager–backed
  secrets (the shared `JWT_SECRET` stays a plaintext local-dev value until then)

## Alternatives considered

- **Wait for Phase 11**: rejected — see Context above.
- **Session cookies instead of JWT**: rejected for now; stateless JWT verification
  at the gateway avoids giving the gateway a session store of its own, consistent
  with it "holding no domain state" ([overview.md](../architecture/overview.md)).
  Revisit if Phase 11's RBAC work wants server-side session revocation.

## Consequences

- `PHASES.md`'s Phase 11 deliverable list is updated to strike "JWT/OIDC auth" down
  to "RBAC + OIDC upgrade for the auth pulled forward in ADR-005", so the roadmap
  doesn't claim work not yet done, and doesn't re-claim work already done here.
- Every existing `POST /riders` / `POST /drivers` caller (tests, seed scripts, the
  frontend) needed a `password` field added — a real, deliberate breaking change to
  those endpoints' contracts, not an additive one.
- The frontend's fake `useAuthStore` users are removed as part of this same change;
  see the commit that introduced this ADR.
