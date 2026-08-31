#!/usr/bin/env bash
# Brings up the Phase 9 kind cluster and deploys the rydtrip Helm chart into
# it, wired to the already-running docker-compose Postgres/Kafka/Redis (this
# script does NOT start docker-compose — run `docker compose up -d
# postgres kafka redis` first, and `docker compose build` the six services
# so their images exist locally for `kind load docker-image`).
set -euo pipefail
cd "$(dirname "$0")/../../.."

CLUSTER_NAME=rydtrip
NAMESPACE=rydtrip
COMPOSE_NETWORK=rydtrip_default

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Creating kind cluster '$CLUSTER_NAME'..."
  kind create cluster --config infrastructure/kubernetes/kind/cluster-config.yaml
fi

# Give every kind node direct L3 reachability to the compose stack's
# containers (see infrastructure/kubernetes/README.md for why this, rather
# than a host-published-port or moving Postgres/Kafka/Redis into the
# cluster, is the approach here).
for node in $(kind get nodes --name "$CLUSTER_NAME"); do
  docker network connect "$COMPOSE_NETWORK" "$node" 2>/dev/null || true
done

POSTGRES_IP=$(docker inspect rydtrip-postgres-1 --format "{{(index .NetworkSettings.Networks \"$COMPOSE_NETWORK\").IPAddress}}")
KAFKA_IP=$(docker inspect rydtrip-kafka-1 --format "{{(index .NetworkSettings.Networks \"$COMPOSE_NETWORK\").IPAddress}}")
REDIS_IP=$(docker inspect rydtrip-redis-1 --format "{{(index .NetworkSettings.Networks \"$COMPOSE_NETWORK\").IPAddress}}")
echo "postgres=$POSTGRES_IP kafka=$KAFKA_IP redis=$REDIS_IP"

echo "Building and loading service images..."
docker compose build rider-service driver-service trip-service location-service dispatch-service api-gateway
for svc in rider-service driver-service trip-service location-service dispatch-service api-gateway; do
  kind load docker-image "rydtrip-$svc:latest" --name "$CLUSTER_NAME"
done

kubectl config use-context "kind-$CLUSTER_NAME"
kubectl get namespace "$NAMESPACE" >/dev/null 2>&1 || kubectl create namespace "$NAMESPACE"

helm upgrade --install rydtrip infrastructure/kubernetes/helm/rydtrip \
  --namespace "$NAMESPACE" \
  --set composeNetwork.postgresIp="$POSTGRES_IP" \
  --set composeNetwork.kafkaIp="$KAFKA_IP" \
  --set composeNetwork.redisIp="$REDIS_IP"

echo "Waiting for rollout..."
kubectl -n "$NAMESPACE" rollout status deployment --timeout=180s || true
kubectl -n "$NAMESPACE" get pods
