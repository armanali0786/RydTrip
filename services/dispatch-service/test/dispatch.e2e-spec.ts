import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { createKafkaClient, EventConsumer, EventEnvelope, KAFKA_TOPICS } from '@rydtrip/event-schema';
import { DriverGeoIndex, DriverReservationStore } from '@rydtrip/redis-client';
import Redis from 'ioredis';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DispatchService } from '../src/dispatch/dispatch.service';

// StartedKafkaContainer has no getBootstrapServers() helper — the PLAINTEXT
// listener testcontainers wires up is exposed on container port 9093.
function bootstrapServers(container: StartedKafkaContainer): string {
  return `${container.getHost()}:${container.getMappedPort(9093)}`;
}

const ORIGIN = { lat: 12.9716, lng: 77.5946 };
const NEARBY_POINT = { lat: 12.975, lng: 77.598 }; // ~0.5km from ORIGIN
const FAR_AWAY = { lat: 40.7128, lng: -74.006 }; // New York — nothing nearby

describe('Dispatch Service (e2e)', () => {
  let redisContainer: StartedRedisContainer;
  let kafka: StartedKafkaContainer;
  let app: INestApplication;
  let testRedis: Redis;
  let geoIndex: DriverGeoIndex;
  let reservations: DriverReservationStore;
  let testKafka: ReturnType<typeof createKafkaClient>;
  let rawProducer: ReturnType<typeof testKafka.producer>;

  beforeAll(async () => {
    redisContainer = await new RedisContainer('redis:7-alpine').start();
    kafka = await new KafkaContainer('confluentinc/cp-kafka:7.6.1').withKraft().start();

    process.env.REDIS_URL = redisContainer.getConnectionUrl();
    process.env.KAFKA_BROKERS = bootstrapServers(kafka);
    // Deliberately unreachable — proves the Driver Service status sync is
    // genuinely best-effort and never blocks the reservation outcome.
    process.env.DRIVER_SERVICE_URL = 'http://localhost:1';
    process.env.RESERVATION_TTL_SECONDS = '30';

    testRedis = new Redis(process.env.REDIS_URL);
    geoIndex = new DriverGeoIndex(testRedis);
    reservations = new DriverReservationStore(testRedis);
    testKafka = createKafkaClient({ clientId: 'test-raw-producer', brokers: [bootstrapServers(kafka)] });
    rawProducer = testKafka.producer();
    await rawProducer.connect();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await rawProducer.disconnect();
    await app.close();
    testRedis.disconnect();
    await redisContainer.stop();
    await kafka.stop();
  });

  it('GET /health/live and /health/ready return 200', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200);
    await request(app.getHttpServer()).get('/health/ready').expect(200);
  });

  it('reserves the nearby driver, syncs best-effort to an unreachable Driver Service without failing, and publishes driver.reserved + driver.accepted', async () => {
    const driverId = randomUUID();
    const rideId = randomUUID();
    await geoIndex.upsertLocation(driverId, NEARBY_POINT.lat, NEARBY_POINT.lng, 60);

    const testKafka = createKafkaClient({ clientId: 'test-consumer', brokers: [bootstrapServers(kafka)] });
    const consumer = new EventConsumer(testKafka, `test-${randomUUID()}`);
    await consumer.connect();
    await consumer.subscribe(['driver.reserved', 'driver.accepted']);

    const events: EventEnvelope[] = [];
    const received = new Promise<void>((resolve) => {
      void consumer.run(async (envelope) => {
        if ((envelope.payload as { rideId?: string }).rideId === rideId) {
          events.push(envelope);
          if (events.length === 2) resolve();
        }
      });
    });

    const dispatchService = app.get(DispatchService);
    await dispatchService.handleRideRequested(rideId, ORIGIN, randomUUID());
    await received;

    const eventTypes = events.map((e) => e.eventType).sort();
    expect(eventTypes).toEqual(['driver.accepted', 'driver.reserved']);
    for (const envelope of events) {
      expect(envelope.payload).toEqual({ rideId, driverId });
    }

    const reservedFor = await reservations.getReservation(driverId);
    expect(reservedFor).toBe(rideId);

    await consumer.disconnect();
  }, 30000);

  it('publishes driver.rejected with NO_DRIVERS_AVAILABLE when no candidate is nearby', async () => {
    const rideId = randomUUID();

    const testKafka = createKafkaClient({ clientId: 'test-consumer-2', brokers: [bootstrapServers(kafka)] });
    const consumer = new EventConsumer(testKafka, `test-${randomUUID()}`);
    await consumer.connect();
    await consumer.subscribe(['driver.rejected']);

    const received = new Promise<EventEnvelope>((resolve) => {
      void consumer.run(async (envelope) => {
        if ((envelope.payload as { rideId?: string }).rideId === rideId) {
          resolve(envelope);
        }
      });
    });

    const dispatchService = app.get(DispatchService);
    await dispatchService.handleRideRequested(rideId, FAR_AWAY, randomUUID());

    const envelope = await received;
    expect(envelope.payload).toEqual({ rideId, reason: 'NO_DRIVERS_AVAILABLE' });

    await consumer.disconnect();
  }, 30000);

  it('falls back to the next candidate when the closest one is already reserved by another ride', async () => {
    const closeDriverId = randomUUID();
    const secondDriverId = randomUUID();
    const alreadyTakenByRideId = randomUUID();
    const rideId = randomUUID();

    await geoIndex.upsertLocation(closeDriverId, ORIGIN.lat, ORIGIN.lng, 60);
    await geoIndex.upsertLocation(secondDriverId, NEARBY_POINT.lat, NEARBY_POINT.lng, 60);
    // Pre-reserve the closest driver for an unrelated ride, before dispatch runs.
    const preReserved = await reservations.tryReserve(closeDriverId, alreadyTakenByRideId, 60);
    expect(preReserved).toBe(true);

    const testKafka = createKafkaClient({ clientId: 'test-consumer-3', brokers: [bootstrapServers(kafka)] });
    const consumer = new EventConsumer(testKafka, `test-${randomUUID()}`);
    await consumer.connect();
    await consumer.subscribe(['driver.accepted']);

    const received = new Promise<EventEnvelope>((resolve) => {
      void consumer.run(async (envelope) => {
        if ((envelope.payload as { rideId?: string }).rideId === rideId) {
          resolve(envelope);
        }
      });
    });

    const dispatchService = app.get(DispatchService);
    await dispatchService.handleRideRequested(rideId, ORIGIN, randomUUID());

    const envelope = await received;
    // Not the closest driver — that one was already taken.
    expect(envelope.payload).toEqual({ rideId, driverId: secondDriverId });

    await consumer.disconnect();
  }, 30000);

  it(
    'exit criterion: two simultaneous ride requests targeting the same sole nearby driver — exactly one wins, one is cleanly rejected',
    async () => {
      const soleDriverId = randomUUID();
      await geoIndex.upsertLocation(soleDriverId, ORIGIN.lat, ORIGIN.lng, 60);

      const rideOne = randomUUID();
      const rideTwo = randomUUID();

      const testKafka = createKafkaClient({ clientId: 'test-consumer-4', brokers: [bootstrapServers(kafka)] });
      const consumer = new EventConsumer(testKafka, `test-${randomUUID()}`);
      await consumer.connect();
      await consumer.subscribe(['driver.accepted', 'driver.rejected']);

      const outcomes = new Map<string, EventEnvelope>();
      const bothResolved = new Promise<void>((resolve) => {
        void consumer.run(async (envelope) => {
          const rideId = (envelope.payload as { rideId?: string }).rideId;
          if (rideId === rideOne || rideId === rideTwo) {
            outcomes.set(rideId, envelope);
            if (outcomes.size === 2) resolve();
          }
        });
      });

      const dispatchService = app.get(DispatchService);
      // Fired concurrently at the same Redis instance — this is what actually
      // exercises the atomic SET NX race, not Kafka's own message ordering
      // (a single consumer would otherwise process these sequentially).
      await Promise.all([
        dispatchService.handleRideRequested(rideOne, ORIGIN, randomUUID()),
        dispatchService.handleRideRequested(rideTwo, ORIGIN, randomUUID()),
      ]);
      await bothResolved;

      const eventTypes = [rideOne, rideTwo].map((id) => outcomes.get(id)!.eventType).sort();
      expect(eventTypes).toEqual(['driver.accepted', 'driver.rejected']);

      const winner = [rideOne, rideTwo].find((id) => outcomes.get(id)!.eventType === 'driver.accepted')!;
      expect((outcomes.get(winner)!.payload as { driverId: string }).driverId).toBe(soleDriverId);

      // Exactly one reservation exists for the sole driver, and it belongs to the winner.
      const finalReservation = await reservations.getReservation(soleDriverId);
      expect(finalReservation).toBe(winner);

      await consumer.disconnect();
    },
    30000,
  );

  it(
    'exit criterion: replaying the same ride.requested event 3x through the real consumer results in exactly one dispatch outcome',
    async () => {
      const driverId = randomUUID();
      const rideId = randomUUID();
      const eventId = randomUUID();
      await geoIndex.upsertLocation(driverId, NEARBY_POINT.lat, NEARBY_POINT.lng, 60);

      const sentEnvelope: EventEnvelope = {
        eventId,
        eventType: KAFKA_TOPICS.RIDE_REQUESTED,
        version: 1,
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        producer: 'test-harness',
        payload: { rideId, riderId: randomUUID(), pickup: ORIGIN, destination: ORIGIN },
      };

      const testConsumerKafka = createKafkaClient({ clientId: 'test-consumer-5', brokers: [bootstrapServers(kafka)] });
      const consumer = new EventConsumer(testConsumerKafka, `test-${randomUUID()}`);
      await consumer.connect();
      await consumer.subscribe(['driver.accepted', 'driver.rejected']);

      const outcomesForRide: EventEnvelope[] = [];
      void consumer.run(async (received) => {
        if ((received.payload as { rideId?: string }).rideId === rideId) {
          outcomesForRide.push(received);
        }
      });

      // Same eventId, sent as 3 separate Kafka messages — simulating
      // redelivery of the identical event, which the real RideRequestedConsumer
      // (going through its own Kafka subscription, not a direct method call)
      // must collapse into exactly one dispatch outcome.
      for (let i = 0; i < 3; i++) {
        await rawProducer.send({
          topic: KAFKA_TOPICS.RIDE_REQUESTED,
          messages: [{ key: rideId, value: JSON.stringify(sentEnvelope) }],
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Exactly one outcome from 3 identical deliveries is the idempotency
      // guarantee under test — which driver wins doesn't matter here (other
      // tests in this suite share the same GEO coordinates and may have
      // left their own still-live candidates nearby), so assert internal
      // consistency (the winning driver actually holds this ride's
      // reservation) rather than assuming this test's own seeded driver wins.
      expect(outcomesForRide).toHaveLength(1);
      expect(outcomesForRide[0].eventType).toBe('driver.accepted');
      const winningDriverId = (outcomesForRide[0].payload as { driverId: string }).driverId;

      const reservedFor = await reservations.getReservation(winningDriverId);
      expect(reservedFor).toBe(rideId);

      await consumer.disconnect();
    },
    30000,
  );

  it(
    'exit criterion: a poison ride.requested payload is retried then parked on dispatch-service.dlt with diagnostic metadata',
    async () => {
      const dlqConsumerKafka = createKafkaClient({ clientId: 'test-dlq-consumer', brokers: [bootstrapServers(kafka)] });
      // dispatch-service.dlt is created lazily (see EventConsumer.ensureDlqTopic) —
      // only the first time a message is actually parked, not eagerly at consumer
      // startup — so it may not exist yet. Pre-create it explicitly, the same way
      // any operator tailing a DLQ topic ahead of time would have to.
      const dlqAdmin = dlqConsumerKafka.admin();
      await dlqAdmin.connect();
      await dlqAdmin.createTopics({ topics: [{ topic: 'dispatch-service.dlt', numPartitions: 1, replicationFactor: 1 }], waitForLeaders: true });
      await dlqAdmin.disconnect();

      const dlqConsumer = dlqConsumerKafka.consumer({ groupId: `test-dlq-${randomUUID()}` });
      await dlqConsumer.connect();
      await dlqConsumer.subscribe({ topic: 'dispatch-service.dlt', fromBeginning: true });

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

      await rawProducer.send({
        topic: KAFKA_TOPICS.RIDE_REQUESTED,
        messages: [
          {
            value: JSON.stringify({
              eventId: randomUUID(),
              eventType: KAFKA_TOPICS.RIDE_REQUESTED,
              version: 1,
              timestamp: new Date().toISOString(),
              correlationId,
              producer: 'test-harness',
              payload: { not: 'a valid payload' },
            }),
          },
        ],
      });

      const record = await received;
      expect(record.dlqReason).toBe('handler-failed');
      expect(record.consumerGroup).toBe('dispatch-service');
      expect(record.originalTopic).toBe(KAFKA_TOPICS.RIDE_REQUESTED);
      expect(record.attempts).toBe(3);
      expect(record.errorMessage).toContain('malformed');

      await request(app.getHttpServer()).get('/health/live').expect(200);

      await dlqConsumer.disconnect();
    },
    30000,
  );
});
