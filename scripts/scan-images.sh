#!/usr/bin/env bash
# Phase 11: container image scanning, wired into the local build so Phase
# 12's CI can call this same script rather than reinventing it. Requires
# Trivy (https://trivy.dev) on PATH and the six service images already built
# (`docker compose build`).
#
# Usage (from the repo root):
#   ./scripts/scan-images.sh              # scan every service image
#   ./scripts/scan-images.sh api-gateway  # scan just one
#
# Exit code is non-zero if Trivy finds a HIGH or CRITICAL vulnerability in
# any scanned image — matching npm audit's --audit-level=high threshold in
# `npm run security:audit`, so both checks fail a build the same way.
set -euo pipefail
cd "$(dirname "$0")/.."

SERVICES=(rider-service driver-service trip-service location-service dispatch-service api-gateway)
TARGETS=("${@:-${SERVICES[@]}}")

if ! command -v trivy >/dev/null 2>&1; then
  echo "trivy not found on PATH — install it from https://trivy.dev/latest/getting-started/installation/" >&2
  exit 1
fi

status=0
for svc in "${TARGETS[@]}"; do
  image="rydtrip-${svc}:latest"
  echo "=== Scanning ${image} ==="
  if ! trivy image --severity HIGH,CRITICAL --exit-code 1 --ignore-unfixed "${image}"; then
    status=1
  fi
done

exit "${status}"
