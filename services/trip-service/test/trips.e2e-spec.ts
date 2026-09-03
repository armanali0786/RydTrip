import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { createKafkaClient, EventEnvelope, EventPublisher, KAFKA_TOPICS } from '@rydtrip/event-schema';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// StartedKafkaContainer has no getBootstrapServers() helper — the PLAINTEXT
// listener testcontainers wires up is exposed on container port 9093.
function bootstrapServers(container: StartedKafkaContainer): string {
  return `${container.getHost()}:${container.getMappedPort(9093)}`;
}

async function waitFor<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  { timeoutMs = 20000, intervalMs = 300 } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const value = await fn();
    if (predicate(value)) return value;
    if (Date.now() > deadline) {
      throw new Error(`waitFor: condition not met within ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

describe('Trip Service (e2e)', () => {
  let pg: StartedPostgreSqlContainer;
  let kafka: StartedKafkaContainer;
  let app: INestApplication;
  let publisher: EventPublisher;
  let testKafka: ReturnType<typeof createKafkaClient>;
  let rawProducer: ReturnType<typeof testKafka.producer>;

  const tripPayload = (rideId: string) => ({
    rideId,
    riderId: randomUUID(),
    pickup: { lat: 12.9716, lng: 77.5946 },
    destination: { lat: 12.9352, lng: 77.6146 },
  });

  beforeAll(async () => {
    pg = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('rydtrip_trips_test')
      .withUsername('rydtrip')
      .withPassword('rydtrip')
      .start();
    kafka = await new KafkaContainer('confluentinc/cp-kafka:7.6.1').withKraft().start();

    process.env.DATABASE_URL = pg.getConnectionUri();
    process.env.KAFKA_BROKERS = bootstrapServers(kafka);

    execSync('npx prisma migrate deploy', { env: { ...process.env }, stdio: 'inherit' });

    testKafka = createKafkaClient({ clientId: 'test-publisher', brokers: [bootstrapServers(kafka)] });
    publisher = new EventPublisher(testKafka, 'test-harness');
    await publisher.connect();
    rawProducer = testKafka.producer();
    await rawProducer.connect();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await publisher.disconnect();
    await rawProducer.disconnect();
    await app.close();
    await pg.stop();
    await kafka.stop();
  });

  const getTrip = (id: string) => request(app.getHttpServer()).get(`/trips/${id}`);

  it('GET /health/live and /health/ready return 200', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200);
    await request(app.getHttpServer()).get('/health/ready').expect(200);
  });

  it('consumes ride.requested and creates the ride, landing in MATCHING', async () => {
    const rideId = randomUUID();
    await publisher.publish(KAFKA_TOPICS.RIDE_REQUESTED, KAFKA_TOPICS.RIDE_REQUESTED, tripPayload(rideId), {
      correlationId: randomUUID(),
      key: rideId,
    });

    const res = await waitFor(
      () => getTrip(rideId).then((r) => r),
      (r) => r.status === 200 && r.body.status === 'MATCHING',
    );
    expect(res.body.id).toBe(rideId);
  });

  it('records the trip_events audit trail for a consumed ride.requested', async () => {
    const rideId = randomUUID();
    await publisher.publish(KAFKA_TOPICS.RIDE_REQUESTED, KAFKA_TOPICS.RIDE_REQUESTED, tripPayload(rideId), {
      correlationId: randomUUID(),
      key: rideId,
    });
    await waitFor(
      () => getTrip(rideId),
      (r) => r.status === 200 && r.body.status === 'MATCHING',
    );

    const prisma = app.get(PrismaService);
    const events = await prisma.tripEvent.findMany({ where: { rideId } });
    expect(events.map((e) => e.eventType).sort()).toEqual(['ride.matching', 'ride.requested'].sort());
  });

  it('consumes ride.cancelled and cancels an existing ride', async () => {
    const rideId = randomUUID();
    await publisher.publish(KAFKA_TOPICS.RIDE_REQUESTED, KAFKA_TOPICS.RIDE_REQUESTED, tripPayload(rideId), {
      correlationId: randomUUID(),
      key: rideId,
    });
    await waitFor(
      () => getTrip(rideId),
      (r) => r.status === 200 && r.body.status === 'MATCHING',
    );

    await publisher.publish(
      KAFKA_TOPICS.RIDE_CANCELLED,
      KAFKA_TOPICS.RIDE_CANCELLED,
      { rideId, reason: 'RIDER_CANCELLED' },
      { correlationId: randomUUID(), key: rideId },
    );

    const res = await waitFor(
      () => getTrip(rideId),
      (r) => r.status === 200 && r.body.status === 'CANCELLED',
    );
    expect(res.body.cancellationReason).toBe('RIDER_CANCELLED');
  });

  it('consumes driver.accepted and matches the ride, advancing to DRIVER_ARRIVING', async () => {
    const rideId = randomUUID();
    const driverId = randomUUID();
    await publisher.publish(KAFKA_TOPICS.RIDE_REQUESTED, KAFKA_TOPICS.RIDE_REQUESTED, tripPayload(rideId), {
      correlationId: randomUUID(),
      key: rideId,
    });
    await waitFor(
      () => getTrip(rideId),
      (r) => r.status === 200 && r.body.status === 'MATCHING',
    );

    await publisher.publish(
      KAFKA_TOPICS.DRIVER_ACCEPTED,
      KAFKA_TOPICS.DRIVER_ACCEPTED,
      { rideId, driverId },
      { correlationId: randomUUID(), key: rideId },
    );

    const res = await waitFor(
      () => getTrip(rideId),
      (r) => r.status === 200 && r.body.status === 'DRIVER_ARRIVING',
    );
    expect(res.body.driverId).toBe(driverId);
  });

  it('consumes driver.rejected and cancels the ride with NO_DRIVERS_AVAILABLE', async () => {
    const rideId = randomUUID();
    await publisher.publish(KAFKA_TOPICS.RIDE_REQUESTED, KAFKA_TOPICS.RIDE_REQUESTED, tripPayload(rideId), {
      correlationId: randomUUID(),
      key: rideId,
    });
    await waitFor(
      () => getTrip(rideId),
      (r) => r.status === 200 && r.body.status === 'MATCHING',
    );

    await publisher.publish(
      KAFKA_TOPICS.DRIVER_REJECTED,
      KAFKA_TOPICS.DRIVER_REJECTED,
      { rideId, reason: 'NO_DRIVERS_AVAILABLE' },
      { correlationId: randomUUID(), key: rideId },
    );

    const res = await waitFor(
      () => getTrip(rideId),
      (r) => r.status === 200 && r.body.status === 'CANCELLED',
    );
    expect(res.body.cancellationReason).toBe('NO_DRIVERS_AVAILABLE');
  });

  it(
    'exit criterion: a poison ride.requested payload is retried then parked on trip-service.dlt with diagnostic metadata, without crashing the consumer loop',
    async () => {
      // trip-service.dlt is created lazily (see EventConsumer.ensureDlqTopic) —
      // only the first time a message is actually parked, not eagerly at consumer
      // startup — so it may not exist yet. Pre-create it explicitly, the same way
      // any operator tailing a DLQ topic ahead of time would have to.
      const dlqAdmin = testKafka.admin();
      await dlqAdmin.connect();
      await dlqAdmin.createTopics({ topics: [{ topic: 'trip-service.dlt', numPartitions: 1, replicationFactor: 1 }], waitForLeaders: true });
      await dlqAdmin.disconnect();

      const dlqConsumer = testKafka.consumer({ groupId: `test-dlq-${randomUUID()}` });
      await dlqConsumer.connect();
      await dlqConsumer.subscribe({ topic: 'trip-service.dlt', fromBeginning: true });

      const correlationId = randomUUID();
      const received = new Promise<Record<string, unknown>>((resolve) => {
        void dlqConsumer.run({
          eachMessage: async ({ message }) => {
            const record = JSON.parse(message.value!.toString()) as Record<string, unknown>;
            const envelope = record.envelope as EventEnvelope | null;
            if (envelope?.correlationId === correlationId) {
              resolve(record);
            }
          },
        });
      });

      await publisher.publish(KAFKA_TOPICS.RIDE_REQUESTED, KAFKA_TOPICS.RIDE_REQUESTED, { not: 'a valid payload' }, {
        correlationId,
      });

      const record = await received;
      expect(record.dlqReason).toBe('handler-failed');
      expect(record.consumerGroup).toBe('trip-service');
      expect(record.originalTopic).toBe(KAFKA_TOPICS.RIDE_REQUESTED);
      expect(record.attempts).toBe(3);
      expect(typeof record.errorMessage).toBe('string');
      expect(record.errorMessage).toContain('malformed');

      // The consumer loop must survive a poison message — proven by the app
      // still answering a totally unrelated request right after.
      await request(app.getHttpServer()).get('/health/live').expect(200);

      await dlqConsumer.disconnect();
    },
    30000,
  );

  it(
    'exit criterion: replaying the same ride.requested event 3x results in exactly one ride and one audit trail, not three',
    async () => {
      const rideId = randomUUID();
      const eventId = randomUUID();
      const envelope: EventEnvelope = {
        eventId,
        eventType: KAFKA_TOPICS.RIDE_REQUESTED,
        version: 1,
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        producer: 'test-harness',
        payload: tripPayload(rideId),
      };

      for (let i = 0; i < 3; i++) {
        await rawProducer.send({
          topic: KAFKA_TOPICS.RIDE_REQUESTED,
          messages: [{ key: rideId, value: JSON.stringify(envelope) }],
        });
      }

      const res = await waitFor(
        () => getTrip(rideId),
        (r) => r.status === 200 && r.body.status === 'MATCHING',
      );
      expect(res.body.id).toBe(rideId);

      // Give the two duplicate deliveries time to be consumed (they should
      // be no-ops) before asserting nothing extra was written.
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const prisma = app.get(PrismaService);
      const events = await prisma.tripEvent.findMany({ where: { rideId } });
      expect(events.map((e) => e.eventType).sort()).toEqual(['ride.matching', 'ride.requested'].sort());

      const processedCount = await prisma.processedEvent.count({ where: { eventId } });
      expect(processedCount).toBe(1);
    },
    30000,
  );

  it(
    'exit criterion: killing the consumer and restarting it resumes from the committed offset with no message loss',
    async () => {
      // 1. Publish and confirm A is processed by the currently running consumer
      //    — this is what advances the committed offset past A.
      const rideA = randomUUID();
      await publisher.publish(KAFKA_TOPICS.RIDE_REQUESTED, KAFKA_TOPICS.RIDE_REQUESTED, tripPayload(rideA), {
        correlationId: randomUUID(),
        key: rideA,
      });
      await waitFor(
        () => getTrip(rideA),
        (r) => r.status === 200 && r.body.status === 'MATCHING',
      );

      // 2. Kill the consumer: close the whole Nest app (runs
      //    RideEventsConsumer.onModuleDestroy -> consumer.disconnect()).
      await app.close();

      // 3. While no consumer is running, publish two more events. Kafka
      //    retains them — nothing is subscribed to receive them yet.
      const rideB = randomUUID();
      const rideC = randomUUID();
      await publisher.publish(KAFKA_TOPICS.RIDE_REQUESTED, KAFKA_TOPICS.RIDE_REQUESTED, tripPayload(rideB), {
        correlationId: randomUUID(),
        key: rideB,
      });
      await publisher.publish(KAFKA_TOPICS.RIDE_REQUESTED, KAFKA_TOPICS.RIDE_REQUESTED, tripPayload(rideC), {
        correlationId: randomUUID(),
        key: rideC,
      });

      // 4. Restart: a brand new app instance, same consumer group id
      //    ("trip-service", hardcoded in RideEventsConsumer) — this is what
      //    makes it resume from the last committed offset rather than
      //    replaying from the beginning or starting from the latest offset.
      const restartedModuleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
      const restartedApp = restartedModuleRef.createNestApplication();
      await restartedApp.init();

      const getTripOnRestarted = (id: string) => request(restartedApp.getHttpServer()).get(`/trips/${id}`);

      // 5. Both B and C — published entirely while the consumer was down —
      //    must still get processed. That's "no message loss".
      const resB = await waitFor(
        () => getTripOnRestarted(rideB),
        (r) => r.status === 200 && r.body.status === 'MATCHING',
      );
      const resC = await waitFor(
        () => getTripOnRestarted(rideC),
        (r) => r.status === 200 && r.body.status === 'MATCHING',
      );
      expect(resB.body.id).toBe(rideB);
      expect(resC.body.id).toBe(rideC);

      // Hand off to afterAll's cleanup — app1 is already closed.
      app = restartedApp;
    },
    30000,
  );

  it('completes a ride through the full driver flow and computes fare/distanceKm from pickup/destination', async () => {
    const rideId = randomUUID();
    const driverId = randomUUID();
    await publisher.publish(KAFKA_TOPICS.RIDE_REQUESTED, KAFKA_TOPICS.RIDE_REQUESTED, tripPayload(rideId), {
      correlationId: randomUUID(),
      key: rideId,
    });
    await waitFor(
      () => getTrip(rideId),
      (r) => r.status === 200 && r.body.status === 'MATCHING',
    );

    await publisher.publish(
      KAFKA_TOPICS.DRIVER_RESERVED,
      KAFKA_TOPICS.DRIVER_RESERVED,
      { rideId, driverId },
      { correlationId: randomUUID(), key: rideId },
    );
    await waitFor(
      () => getTrip(rideId),
      (r) => r.status === 200 && r.body.status === 'MATCHED',
    );

    await request(app.getHttpServer()).post(`/trips/${rideId}/accept`).expect(201);
    await request(app.getHttpServer()).post(`/trips/${rideId}/driver-arrived`).expect(201);
    await request(app.getHttpServer()).post(`/trips/${rideId}/start`).expect(201);
    const completeRes = await request(app.getHttpServer()).post(`/trips/${rideId}/complete`).expect(201);

    expect(completeRes.body.status).toBe('COMPLETED');
    // pickup {12.9716, 77.5946} -> destination {12.9352, 77.6146}, great-circle ~4.4km.
    expect(completeRes.body.distanceKm).toBeGreaterThan(3);
    expect(completeRes.body.distanceKm).toBeLessThan(6);
    expect(completeRes.body.fare).toBe(Math.round(40 + 12 * completeRes.body.distanceKm));

    const getRes = await getTrip(rideId).expect(200);
    expect(getRes.body.fare).toBe(completeRes.body.fare);
    expect(getRes.body.distanceKm).toBe(completeRes.body.distanceKm);
  });

  it('GET /trips/rider/:riderId/history returns that rider\'s rides, most recent first', async () => {
    const riderId = randomUUID();
    const rideA = randomUUID();
    const rideB = randomUUID();

    await publisher.publish(
      KAFKA_TOPICS.RIDE_REQUESTED,
      KAFKA_TOPICS.RIDE_REQUESTED,
      { rideId: rideA, riderId, pickup: { lat: 12.9716, lng: 77.5946 }, destination: { lat: 12.9352, lng: 77.6146 } },
      { correlationId: randomUUID(), key: rideA },
    );
    await waitFor(
      () => getTrip(rideA),
      (r) => r.status === 200 && r.body.status === 'MATCHING',
    );

    await publisher.publish(
      KAFKA_TOPICS.RIDE_REQUESTED,
      KAFKA_TOPICS.RIDE_REQUESTED,
      { rideId: rideB, riderId, pickup: { lat: 12.9716, lng: 77.5946 }, destination: { lat: 12.9352, lng: 77.6146 } },
      { correlationId: randomUUID(), key: rideB },
    );
    await waitFor(
      () => getTrip(rideB),
      (r) => r.status === 200 && r.body.status === 'MATCHING',
    );

    const historyRes = await request(app.getHttpServer()).get(`/trips/rider/${riderId}/history`).expect(200);
    const ids = historyRes.body.rides.map((r: { id: string }) => r.id);
    expect(ids).toEqual([rideB, rideA]);
  });

  it('GET /trips/driver/:driverId/history returns that driver\'s rides', async () => {
    const driverId = randomUUID();
    const rideId = randomUUID();
    await publisher.publish(KAFKA_TOPICS.RIDE_REQUESTED, KAFKA_TOPICS.RIDE_REQUESTED, tripPayload(rideId), {
      correlationId: randomUUID(),
      key: rideId,
    });
    await waitFor(
      () => getTrip(rideId),
      (r) => r.status === 200 && r.body.status === 'MATCHING',
    );
    await publisher.publish(
      KAFKA_TOPICS.DRIVER_RESERVED,
      KAFKA_TOPICS.DRIVER_RESERVED,
      { rideId, driverId },
      { correlationId: randomUUID(), key: rideId },
    );
    await waitFor(
      () => getTrip(rideId),
      (r) => r.status === 200 && r.body.status === 'MATCHED',
    );

    const historyRes = await request(app.getHttpServer()).get(`/trips/driver/${driverId}/history`).expect(200);
    expect(historyRes.body.rides.map((r: { id: string }) => r.id)).toContain(rideId);
  });
});
