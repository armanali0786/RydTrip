# Guidelines for Claude

## Git discipline

- **Never run `git commit`.** Leave all changes staged/unstaged in the working tree for the user to review and commit themselves.
- **Never run `git push`, `git push --force`, or any push-equivalent** (e.g. `gh pr merge`, `gh release create` that publishes, syncing a tag to a remote). Local, uncommitted work only.
- This applies even after the user approves the change itself ("looks good", "that's correct") — approval of content is not authorization to commit or push. Only proceed if the user's current message explicitly asks you to commit or push in that moment.
- Creating local tags, branches, or stashes is fine; pushing any of them to a remote is not.

## Security standards — no data breaches

This platform handles rider/driver PII, live location data, trip history, and auth credentials. Treat every change as security-sensitive:

- **Never commit secrets.** No API keys, DB credentials, JWT signing secrets, or tokens in code, config, logs, or commit messages. Use environment variables / secret managers; check `.env*` files are gitignored before touching them.
- **Never log or expose sensitive data.** No PII (names, phone numbers, emails, precise location, payment info) in logs, error messages, or client-visible responses beyond what's strictly needed.
- **Enforce authN/authZ on every endpoint.** Respect existing RBAC and resource-ownership checks (see `libraries/security`); never add a route that bypasses them.
- **Validate and sanitize all external input** (API payloads, query params, webhook bodies) at service boundaries. Use parameterized queries / Prisma's query builder — never string-concatenated SQL.
- **Follow OWASP Top 10 practices**: no injection, no broken access control, no sensitive data exposure, safe deserialization, secure defaults on new config.
- **Encrypt sensitive data in transit and at rest** where the platform already does so; don't introduce plaintext channels or storage for credentials, tokens, or location history.
- **Least privilege**: new services, DB users, or IAM roles get only the access they need — don't broaden existing scopes to work around a permissions error without flagging it to the user first.
- If a task seems to require weakening a security control (disabling auth, widening CORS, logging a secret, skipping input validation) to move faster, stop and ask the user instead of doing it.
