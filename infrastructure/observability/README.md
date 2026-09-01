# Observability (Phase 10)

Prometheus, Grafana, and Jaeger run as plain docker-compose services (`docker-compose.yml`
in the repo root) — same as Postgres/Kafka/Redis, and deliberately **not** part of the
Phase 9 Helm chart/kind cluster, to keep this phase's scope to what PHASES.md actually
asks for rather than doubling the infra surface.

## What's here

- `prometheus/prometheus.yml` — scrape config. Targets every app service's own
  `GET /metrics` (added by `@rydtrip/observability`'s `MetricsModule`) plus
  `kafka-exporter` and `redis-exporter`, which expose broker/store-side metrics
  (consumer lag, topic throughput, memory, connected clients) that no Node client
  library can see from inside a service process.
- `grafana/provisioning/` — datasource (Prometheus, fixed `uid: prometheus` so dashboard
  JSON can reference it without a templating variable) and a dashboard-file provider
  pointed at `grafana/dashboards/`. Both are provisioned automatically on container
  start — no manual "add datasource" / "import dashboard" clicking.
- `grafana/dashboards/*.json` — API Overview, Kafka, Redis, Dispatch. Plain dashboard
  JSON (not exported from a live Grafana instance) — edit these files directly and
  Grafana's file-provider picks up changes within `updateIntervalSeconds` (30s).

## Accessing everything

| Tool | URL | Notes |
|---|---|---|
| Grafana | http://localhost:3300 | `admin`/`admin`; anonymous Viewer access is also enabled for local convenience. Container's own default port (3000) collides with api-gateway's host mapping, hence 3300 — override with `GRAFANA_HOST_PORT`. |
| Prometheus | http://localhost:9090 | Targets page: http://localhost:9090/targets |
| Jaeger UI | http://localhost:16686 | Search by service name, or by tag `correlationId=<id>` to find the trace for one specific request — the same id already used for cross-service log correlation. |

## Tracing: why it works without manual span-stitching

Every service calls `initTracing(serviceName)` (`libraries/observability`) as the literal
first line of its `main.ts`, before `reflect-metadata` or anything else. OpenTelemetry's
Node auto-instrumentation patches `http`, `fetch` (via `undici`), `kafkajs`, and `ioredis`
by hooking `require` — which only works if it runs before those modules are first
required anywhere else in the process. Once that's true, trace context propagates on its
own: an HTTP call injects a `traceparent` header the callee's own `http` instrumentation
picks up automatically; a Kafka publish injects it into message headers, which the
consumer's instrumentation extracts. The result: API Gateway's proxy call to Rider
Service, Rider Service's Kafka publish, Dispatch's and Trip's Kafka consumes, and
Dispatch's Redis calls all land as spans in *one* trace — verified live by creating a
real ride through the API Gateway and finding a single Jaeger trace spanning all four
services (see PHASES.md's Phase 10 exit criteria for the exact spans).

## Local resource note

Prometheus/Grafana/Jaeger/kafka-exporter/redis-exporter add five more containers to an
already-large local stack. If you're not actively looking at dashboards/traces, `docker
compose stop prometheus grafana jaeger kafka-exporter redis-exporter` frees the resources
without touching the app services — tracing calls just become inert
(the OTLP exporter fails silently and services run exactly as before).
