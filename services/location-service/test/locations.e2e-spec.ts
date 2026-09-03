import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { EventConsumer, createKafkaClient, EventEnvelope } from '@rydtrip/event-schema';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// StartedKafkaContainer has no getBootstrapServers() helper — the PLAINTEXT
// listener testcontainers wires up is exposed on container port 9093.
function bootstrapServers(container: StartedKafkaContainer): string {
  return `${container.getHost()}:${container.getMappedPort(9093)}`;
}

// Bangalore MG Road area, reused from rider-service's e2e fixtures.
const ORIGIN = { lat: 12.9716, lng: 77.5946 };
const NEARBY_POINT = { lat: 12.975, lng: 77.598 }; // ~0.5km from ORIGIN
const FAR_POINT = { lat: 13.2, lng: 77.9 }; // ~40km from ORIGIN

describe('Location Service (e2e)', () => {
  let redis: StartedRedisContainer;
  let kafka: StartedKafkaContainer;
  let app: INestApplication;

  beforeAll(async () => {
    redis = await new RedisContainer('redis:7-alpine').start();
    kafka = await new KafkaContainer('confluentinc/cp-kafka:7.6.1').withKraft().start();

    process.env.REDIS_URL = redis.getConnectionUrl();
    process.env.KAFKA_BROKERS = bootstrapServers(kafka);
    // Short heartbeat TTL so the staleness exit-criterion test doesn't need a
    // real 30s wait — every test in this file tolerates a 1s TTL.
    process.env.DRIVER_HEARTBEAT_TTL_SECONDS = '1';

    // A brand-new single-broker KRaft cluster hasn't elected a leader for its
    // internal __consumer_offsets topic yet — that only happens on the very
    // first consumer group join, and can transiently fail coordinator lookups
    // for a few seconds while it does. Absorbing that race here, inside
    // beforeAll's generous testTimeout, means the "publishes a
    // driver.location.updated event" test below isn't the one racing it
    // against a tight per-test timeout.
    const warmupConsumer = new EventConsumer(
      createKafkaClient({ clientId: 'warmup', brokers: [bootstrapServers(kafka)] }),
      'warmup',
    );
    await warmupConsumer.connect();
    await warmupConsumer.subscribe(['driver.location.updated']);
    // subscribe() only pre-creates the topic — the group coordinator lookup
    // and join that's actually racy only happens once run() starts, so the
    // warm-up has to go that far too.
    await warmupConsumer.run(async () => {});
    await warmupConsumer.disconnect();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await redis.stop();
    await kafka.stop();
  });

  it('GET /health/live and /health/ready return 200', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200);
    await request(app.getHttpServer()).get('/health/ready').expect(200);
  });

  it('rejects an out-of-range coordinate with 400', async () => {
    await request(app.getHttpServer())
      .post(`/drivers/${randomUUID()}/location`)
      .send({ lat: 999, lng: 77.5946 })
      .expect(400);
  });

  it('POST /drivers/:id/location returns 202 and publishes a driver.location.updated event', async () => {
    const driverId = randomUUID();
    const correlationId = randomUUID();

    const testKafka = createKafkaClient({ clientId: 'test-consumer', brokers: [bootstrapServers(kafka)] });
    const consumer = new EventConsumer(testKafka, `test-${randomUUID()}`);
    await consumer.connect();
    await consumer.subscribe(['driver.location.updated']);

    // consumer.run() is fire-and-forget internally — a crash (e.g. broker not
    // yet ready for this consumer group's first join) must reject `received`
    // too, or the test just burns its full timeout and, worse, never reaches
    // consumer.disconnect() below, leaking a background retry loop that
    // outlives afterAll's kafka.stop().
    const received: Promise<EventEnvelope> = new Promise((resolve, reject) => {
      void consumer.run(async (envelope) => {
        if (envelope.correlationId === correlationId) {
          resolve(envelope);
        }
      }).catch(reject);
    });

    try {
      const res = await request(app.getHttpServer())
        .post(`/drivers/${driverId}/location`)
        .set('x-correlation-id', correlationId)
        .send({ lat: ORIGIN.lat, lng: ORIGIN.lng })
        .expect(202);

      expect(res.body).toEqual({ driverId, status: 'ACCEPTED' });

      const envelope = await received;
      expect(envelope.eventType).toBe('driver.location.updated');
      expect(envelope.producer).toBe('location-service');
      expect(envelope.payload).toEqual({ driverId, lat: ORIGIN.lat, lng: ORIGIN.lng });
    } finally {
      await consumer.disconnect();
    }
  }, 30000);

  it('exit criterion: GEOSEARCH returns correct nearby drivers for a known synthetic dataset', async () => {
    const closeDriverId = randomUUID();
    const nearbyDriverId = randomUUID();
    const farDriverId = randomUUID();

    await request(app.getHttpServer())
      .post(`/drivers/${closeDriverId}/location`)
      .send({ lat: ORIGIN.lat, lng: ORIGIN.lng })
      .expect(202);
    await request(app.getHttpServer())
      .post(`/drivers/${nearbyDriverId}/location`)
      .send({ lat: NEARBY_POINT.lat, lng: NEARBY_POINT.lng })
      .expect(202);
    await request(app.getHttpServer())
      .post(`/drivers/${farDriverId}/location`)
      .send({ lat: FAR_POINT.lat, lng: FAR_POINT.lng })
      .expect(202);

    const res = await request(app.getHttpServer())
      .get('/drivers/nearby')
      .query({ lat: ORIGIN.lat, lng: ORIGIN.lng, radiusKm: 5, limit: 10 })
      .expect(200);

    const foundIds = res.body.drivers.map((d: { driverId: string }) => d.driverId);
    expect(foundIds).toContain(closeDriverId);
    expect(foundIds).toContain(nearbyDriverId);
    expect(foundIds).not.toContain(farDriverId);

    // Closest driver must be ranked first (ASC by distance).
    expect(foundIds[0]).toBe(closeDriverId);

    const close = res.body.drivers.find((d: { driverId: string }) => d.driverId === closeDriverId);
    const nearby = res.body.drivers.find((d: { driverId: string }) => d.driverId === nearbyDriverId);
    expect(close.distanceKm).toBeLessThan(0.1);
    expect(nearby.distanceKm).toBeGreaterThan(0.1);
    expect(nearby.distanceKm).toBeLessThan(5);
  });

  it('exit criterion: a driver whose heartbeat TTL expires is excluded from search results', async () => {
    const driverId = randomUUID();

    await request(app.getHttpServer())
      .post(`/drivers/${driverId}/location`)
      .send({ lat: ORIGIN.lat, lng: ORIGIN.lng })
      .expect(202);

    const immediateRes = await request(app.getHttpServer())
      .get('/drivers/nearby')
      .query({ lat: ORIGIN.lat, lng: ORIGIN.lng, radiusKm: 5, limit: 10 })
      .expect(200);
    expect(immediateRes.body.drivers.map((d: { driverId: string }) => d.driverId)).toContain(driverId);

    // DRIVER_HEARTBEAT_TTL_SECONDS=1 for this whole suite (see beforeAll).
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const afterExpiryRes = await request(app.getHttpServer())
      .get('/drivers/nearby')
      .query({ lat: ORIGIN.lat, lng: ORIGIN.lng, radiusKm: 5, limit: 10 })
      .expect(200);
    expect(afterExpiryRes.body.drivers.map((d: { driverId: string }) => d.driverId)).not.toContain(driverId);
  }, 15000);
});
