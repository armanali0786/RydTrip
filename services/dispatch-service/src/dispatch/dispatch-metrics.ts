import { CircuitState } from '@rydtrip/circuit-breaker';
import { Counter, Gauge, register } from 'prom-client';

const CIRCUIT_STATE_VALUE: Record<CircuitState, number> = { CLOSED: 0, HALF_OPEN: 1, OPEN: 2 };

// getSingleMetric guards re-registration the same way http-metrics.middleware
// does — dispatch.service.spec.ts constructs several DispatchService
// instances in one Jest process, which would otherwise hit prom-client's
// "metric already registered" error on the second instance.
export function getRidesProcessedCounter(): Counter<'outcome'> {
  const existing = register.getSingleMetric('dispatch_rides_processed_total');
  if (existing) {
    return existing as Counter<'outcome'>;
  }
  return new Counter({
    name: 'dispatch_rides_processed_total',
    help: 'ride.requested events processed by Dispatch Service, by outcome',
    labelNames: ['outcome'],
  });
}

interface TrackedBreaker {
  name: string;
  getState: () => CircuitState;
}

const trackedBreakers: TrackedBreaker[] = [];

function getOrCreateCircuitGauge(): Gauge<'circuit'> {
  const existing = register.getSingleMetric('dispatch_circuit_breaker_state');
  if (existing) {
    return existing as Gauge<'circuit'>;
  }
  return new Gauge({
    name: 'dispatch_circuit_breaker_state',
    help: 'Circuit breaker state: 0=CLOSED, 1=HALF_OPEN, 2=OPEN',
    labelNames: ['circuit'],
    collect() {
      for (const breaker of trackedBreakers) {
        this.set({ circuit: breaker.name }, CIRCUIT_STATE_VALUE[breaker.getState()]);
      }
    },
  });
}

/** Samples `getState()` on every Prometheus scrape rather than once at call time. */
export function registerCircuitStateGauge(name: string, getState: () => CircuitState): void {
  getOrCreateCircuitGauge();
  const existingIndex = trackedBreakers.findIndex((b) => b.name === name);
  if (existingIndex >= 0) {
    // A fresh DispatchService instance (e.g. a new test) replaces the
    // previous instance's now-stale closure rather than accumulating dupes.
    trackedBreakers[existingIndex] = { name, getState };
  } else {
    trackedBreakers.push({ name, getState });
  }
}
