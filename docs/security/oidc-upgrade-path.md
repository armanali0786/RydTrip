# OIDC Upgrade Path (Phase 11)

ADR-005 pulled forward a **minimal, real** auth flow: rider/driver registration and
login issue a JWT signed with a shared secret (`JWT_SECRET`), verified at the API
Gateway. This document is the design for replacing that shared-secret JWT with a real
OIDC identity provider — a design, not an implementation; nothing here has shipped yet.

## Why not now

ADR-005 was itself an out-of-order exception, justified by the frontend needing *some*
real identity to build against. Standing up an OIDC provider (Auth0, AWS Cognito, or a
self-hosted Keycloak) is a materially bigger step — new infra, a migration for every
existing rider/driver row, and a frontend redirect-based login flow replacing the
current inline form — and doesn't unblock anything else still on the roadmap the way
ADR-005's pull-forward did. It belongs with Phase 13 (Terraform + AWS), where Cognito is
the natural choice sitting next to the rest of the AWS-managed stack anyway.

## Target shape

- **Provider**: AWS Cognito User Pools — two pools (or one pool with a custom
  `role` attribute), rider and driver. Chosen over Auth0/Keycloak because Phase 13
  already puts everything else on AWS; a second SaaS vendor or a self-hosted Keycloak
  deployment would be extra operational surface for no benefit here.
- **Token shape**: Cognito issues its own JWT (ID token + access token), signed with
  Cognito's rotating key set (JWKS), not `JWT_SECRET`. The API Gateway's
  `JwtAuthGuard` swaps `jwtService.verifyAsync()` (HMAC, shared secret) for JWKS-based
  RS256 verification (`jwks-rsa` + `jsonwebtoken`, or `@nestjs/passport` with a
  `passport-jwt` strategy configured for a JWKS endpoint) — the RBAC layer built in this
  phase (`ROLE_POLICIES` in `jwt-auth.guard.ts`) is unaffected, since it only reads
  `sub`/`role` off the already-verified payload, not how it was signed.
- **Role claim**: Cognito custom attribute `custom:role` (`rider` | `driver` |
  `operator`), mapped to `AuthenticatedUser.role` the same way the current JWT's `role`
  claim is today. `operator` becomes real the moment Cognito's admin API (or an
  operator-only user pool group) is used to provision one — this phase's RBAC already
  has nowhere else to change for that.
- **Migration**: existing `passwordHash` rows in rider-service/driver-service's Postgres
  can't be imported into Cognito directly (different hashing scheme) — Cognito supports
  a [migration Lambda trigger](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html)
  that verifies against the *old* system (this project's existing bcrypt check) on first
  login post-cutover and creates the Cognito user transparently, avoiding a forced
  mass password reset.
- **Frontend**: `apps/web`'s `LoginPage.tsx` (currently an inline form posting directly
  to `/riders/login` / `/drivers/login`) moves to Cognito Hosted UI or Amplify's
  `signIn()`, since real OIDC is a redirect/PKCE flow, not a same-page POST. The
  guest-browsing design (`RiderPage.tsx`'s login-gate overlay) doesn't need to change in
  spirit — it can still overlay a Cognito hosted-UI iframe/redirect the same way it
  overlays `LoginPage` today.

## What doesn't change

- `PUBLIC_ROUTES`/`PUBLIC_PATTERNS`/`ROLE_POLICIES` in `jwt-auth.guard.ts` — these encode
  *authorization* (which route needs which role), independent of *authentication*
  (how the token was issued/verified).
- Downstream services (rider-service, driver-service, ...) still never see a token at
  all — the gateway remains the only thing that verifies identity, forwarding
  `x-user-id`/`x-user-role` headers exactly as it does today.

## Sequencing

1. Provision the Cognito user pool(s) via Terraform (Phase 13).
2. Add the migration Lambda trigger; deploy the gateway's JWKS-based verifier
   alongside the existing HMAC one (dual-accept, both token shapes valid) for a
   transition window.
3. Cut the frontend over to Cognito Hosted UI / Amplify.
4. Once no HMAC-signed tokens are in active use (access tokens are short-lived, so this
   window is small), remove the shared-secret verification path and `JWT_SECRET`
   entirely — see [secrets-management.md](secrets-management.md) for what replaces it in
   the meantime for anything that still needs a shared secret.
