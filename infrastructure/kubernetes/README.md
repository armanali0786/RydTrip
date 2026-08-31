# Kubernetes (Phase 9)

All six NestJS services run on a local [kind](https://kind.sigs.k8s.io/) cluster via a
single Helm chart. Postgres, Kafka, and Redis **stay in docker-compose** — they are not
part of this chart or this cluster.

## Why infra stays outside the cluster

PHASES.md's Phase 9 deliverables only ever mention manifests "per service" — the six app
services, not stateful infra. That matches the project's cost philosophy: Postgres/Kafka/
Redis get their production-grade (managed) equivalents in Phase 13 (Terraform + AWS);
until then they're plain docker-compose containers everywhere, kind included.

## How pods reach docker-compose's Postgres/Kafka/Redis

This is the one genuinely tricky part of bridging kind to an external docker-compose
stack, so it's worth spelling out:

1. `infrastructure/kubernetes/scripts/up.sh` connects every kind node container to the
   `rydtrip_default` docker network (the network docker-compose creates) —
   `docker network connect rydtrip_default <kind-node>`. kind's own pod network (a CNI
   overlay) routes pod-egress traffic through the node's own network stack, so once the
   node is multi-homed like this, pods can reach `rydtrip_default` container IPs directly.
2. Pods don't get Docker's embedded DNS, so container **names** (`postgres`, `kafka`,
   `redis` — the exact hostnames docker-compose.yml's own services already use) aren't
   resolvable out of the box. The chart fixes this with Kubernetes' native `hostAliases`
   on each pod that needs it, mapping those exact hostnames to the containers' current
   IPs on `rydtrip_default` (queried via `docker inspect`, passed to Helm as
   `composeNetwork.postgresIp` / `.kafkaIp` / `.redisIp`).
3. Because the hostname pods resolve (`kafka`) is the *same* hostname Kafka's own
   `PLAINTEXT` listener is advertised as (`KAFKA_ADVERTISED_LISTENERS:
   PLAINTEXT://kafka:9092` in docker-compose.yml), this sidesteps Kafka's classic
   advertised-listener trap entirely — no new listener, no host-published-port
   confusion. Every service's env vars are consequently **identical** between
   docker-compose and Kubernetes (`DATABASE_URL=...@postgres:5432/...`,
   `KAFKA_BROKERS=kafka:9092`, `REDIS_URL=redis://redis:6379`) — see `values.yaml`.

Caveat: the compose containers' IPs are captured once, at `up.sh` time. If you recreate
the compose stack (`docker compose down && docker compose up -d`), the containers get new
IPs and pods will lose connectivity until you re-run `up.sh` (or `helm upgrade` with fresh
`--set composeNetwork...` values). Acceptable for local dev; not a pattern to carry into
Phase 13's AWS setup, where RDS/MSK/ElastiCache get stable managed endpoints instead.

## Bringing it up

```bash
docker compose up -d postgres kafka redis   # infra must already be running
infrastructure/kubernetes/scripts/up.sh     # creates the cluster (if needed), builds +
                                             # loads images, installs the Helm chart
```

The cluster is single-node (control-plane only) — see
`infrastructure/kubernetes/kind/cluster-config.yaml` for why: this dev machine already
runs a second, unrelated kind cluster, and a control-plane + worker attempt genuinely
failed to bootstrap here under the combined load. A single node still un-taints the
control-plane for scheduling, so none of the exit criteria below need a second node.

`kubectl top nodes` requires `metrics-server`, which kind doesn't ship —
`infrastructure/kubernetes/metrics-server/kustomization.yaml` installs upstream
metrics-server patched with `--kubelet-insecure-tls` (a kind-only adjustment; kind's
kubelet serving certs aren't signed for what metrics-server's default TLS verification
expects). Apply it once per cluster: `kubectl apply -k infrastructure/kubernetes/metrics-server`.

## Exit criteria — how they were demoed

**`kubectl delete pod <dispatch-pod>` — traffic continues, pod is recreated:**
deleted a running `dispatch-service` pod, then immediately published a `ride.requested`
event while the replacement pod was still starting. The Deployment controller recreated
the pod under a new name within seconds, and — because the event sat durably on its Kafka
partition rather than being lost — the recreated pod picked it up and completed the match
once it became ready. Both halves of the criterion (recreation, and no work lost across
the gap) hold for a Kafka-consuming service that has no synchronous request path.

**Load increase visibly triggers HPA scale-out:** with `metrics-server` installed and
`dispatch-service`/`location-service`'s HPAs targeting 60% CPU utilization, publishing a
burst of ride.requested events drove `dispatch-service` from 1 → 4 replicas (its
`maxReplicas`) and `location-service` from 1 → 4 as a side effect of the same load —
`kubectl -n rydtrip describe hpa dispatch-service` records the scale event directly:
`SuccessfulRescale ... reason: cpu resource utilization (percentage of request) above
target`.

## Useful commands

```bash
kubectl -n rydtrip get pods,hpa
kubectl -n rydtrip logs deployment/dispatch-service
kubectl -n rydtrip port-forward svc/api-gateway 3000:3000   # hit it like docker-compose's
```
