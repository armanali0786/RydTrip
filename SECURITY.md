# Security Policy

This is a personal learning/demonstration project (RydTrip), not a production service
handling real user data. That said:

- Never commit credentials, API keys, JWT secrets, or `.env` files — see `.gitignore`.
- From Phase 11 onward, `docs/security/threat-model.md` tracks the project's threat
  model (double assignment, event replay, driver location spoofing, etc.).
- No production traffic or real personal data is ever processed by this system.

If you find a security issue in this repo's code (not infrastructure — no shared
infrastructure is kept running), open an issue describing it.
