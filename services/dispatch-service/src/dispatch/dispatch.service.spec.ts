import { randomUUID } from 'node:crypto';
import { CircuitOpenError } from '@rydtrip/circuit-breaker';
import { KafkaPublisherService } from '../kafka/kafka-publisher.service';
import { RedisService } from '../redis/redis.service';
import { DispatchService } from './dispatch.service';

/**
 * Unit-level coverage for the Phase 8 circuit breaker wiring — the
 * CircuitBreaker state machine itself is already exhaustively tested in
 * libraries/circuit-breaker; this only proves DispatchService actually
 * wires one around its Redis calls and fails fast once it's open, without
 * needing a real Redis/Kafka via Testcontainers (that's what
 * dispatch.e2e-spec.ts is for).
 */
describe('DispatchService circuit breaker (unit)', () => {
  const ORIGIN = { lat: 12.9716, lng: 77.5946 };

  beforeEach(() => {
    process.env.DISPATCH_CIRCUIT_FAILURE_THRESHOLD = '3';
    process.env.DISPATCH_CIRCUIT_RESET_TIMEOUT_MS = '10000';
  });

  function buildService(findNearby: jest.Mock) {
    const fakeRedis = {
      geoIndex: { findNearby },
      reservations: { tryReserve: jest.fn() },
      idempotency: { wasProcessed: jest.fn(), markProcessed: jest.fn() },
    } as unknown as RedisService;
    const fakeKafkaPublisher = { publish: jest.fn().mockResolvedValue(undefined) } as unknown as KafkaPublisherService;
    return { service: new DispatchService(fakeRedis, fakeKafkaPublisher), fakeKafkaPublisher };
  }

  it('opens the Redis circuit after failureThreshold consecutive Redis errors, then fails fast without calling Redis again', async () => {
    const findNearby = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const { service } = buildService(findNearby);

    for (let i = 0; i < 3; i++) {
      await expect(service.handleRideRequested(randomUUID(), ORIGIN, randomUUID())).rejects.toThrow('ECONNREFUSED');
    }
    expect(findNearby).toHaveBeenCalledTimes(3);

    // The circuit is now OPEN — a 4th call must fail fast with
    // CircuitOpenError and must NOT invoke findNearby again.
    await expect(service.handleRideRequested(randomUUID(), ORIGIN, randomUUID())).rejects.toBeInstanceOf(CircuitOpenError);
    expect(findNearby).toHaveBeenCalledTimes(3);
  });

  it('a healthy Redis call after failures keeps the circuit CLOSED and returns normally', async () => {
    const findNearby = jest.fn().mockResolvedValue([]);
    const { service, fakeKafkaPublisher } = buildService(findNearby);

    await service.handleRideRequested(randomUUID(), ORIGIN, randomUUID());
    expect(findNearby).toHaveBeenCalledTimes(1);
    expect(fakeKafkaPublisher.publish).toHaveBeenCalledWith(
      'driver.rejected',
      'driver.rejected',
      expect.objectContaining({ reason: 'NO_DRIVERS_AVAILABLE' }),
      expect.anything(),
    );
  });
});
