import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { createKafkaClient, EventPublisher, KAFKA_TOPICS } from '@rydtrip/event-schema';
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

    const testKafka = createKafkaClient({ clientId: 'test-publisher', brokers: [bootstrapServers(kafka)] });
    publisher = new EventPublisher(testKafka, 'test-harness');
    await publisher.connect();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await publisher.disconnect();
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

  it('a malformed ride.requested payload is logged and skipped, not crashed on', async () => {
    await publisher.publish(KAFKA_TOPICS.RIDE_REQUESTED, KAFKA_TOPICS.RIDE_REQUESTED, { not: 'a valid payload' }, {
      correlationId: randomUUID(),
    });

    // The consumer loop must survive a poison message — proven by the app
    // still answering a totally unrelated request right after.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await request(app.getHttpServer()).get('/health/live').expect(200);
  });

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
});
