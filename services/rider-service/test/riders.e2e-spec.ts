import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { EventConsumer, createKafkaClient, EventEnvelope } from '@rydtrip/event-schema';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// StartedKafkaContainer has no getBootstrapServers() helper — the PLAINTEXT
// listener testcontainers wires up is exposed on container port 9093.
function bootstrapServers(container: StartedKafkaContainer): string {
  return `${container.getHost()}:${container.getMappedPort(9093)}`;
}

describe('Rider Service (e2e)', () => {
  let pg: StartedPostgreSqlContainer;
  let kafka: StartedKafkaContainer;
  let app: INestApplication;

  beforeAll(async () => {
    pg = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('rydtrip_riders_test')
      .withUsername('rydtrip')
      .withPassword('rydtrip')
      .start();
    kafka = await new KafkaContainer('confluentinc/cp-kafka:7.6.1').withKraft().start();

    process.env.DATABASE_URL = pg.getConnectionUri();
    process.env.KAFKA_BROKERS = bootstrapServers(kafka);

    execSync('npx prisma migrate deploy', { env: { ...process.env }, stdio: 'inherit' });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await pg.stop();
    await kafka.stop();
  });

  it('GET /health/live and /health/ready return 200', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200);
    await request(app.getHttpServer()).get('/health/ready').expect(200);
  });

  it('creates a rider and fetches it', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/riders')
      .send({ name: 'Priya Sharma', phone: '+919876543210', email: 'priya@example.com', password: 'super-secret' })
      .expect(201);

    expect(createRes.body.id).toBeDefined();

    const getRes = await request(app.getHttpServer())
      .get(`/riders/${createRes.body.id}`)
      .expect(200);
    expect(getRes.body.name).toBe('Priya Sharma');
    expect(getRes.body.rating).toBe(5);
  });

  it('PATCH /riders/:id updates name/phone/email and persists the change', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/riders')
      .send({ name: 'Old Name', phone: '+911234512121', email: 'old-name@example.com', password: 'super-secret' })
      .expect(201);
    const riderId = createRes.body.id;

    const patchRes = await request(app.getHttpServer())
      .patch(`/riders/${riderId}`)
      .send({ name: 'New Name', phone: '+911234513131' })
      .expect(200);

    expect(patchRes.body.name).toBe('New Name');
    expect(patchRes.body.phone).toBe('+911234513131');
    expect(patchRes.body.email).toBe('old-name@example.com');

    const getRes = await request(app.getHttpServer()).get(`/riders/${riderId}`).expect(200);
    expect(getRes.body.name).toBe('New Name');
  });

  it('PATCH /riders/:id rejects a phone/email already taken by another rider with 409', async () => {
    await request(app.getHttpServer())
      .post('/riders')
      .send({ name: 'Taken Phone', phone: '+911234514141', email: 'taken-phone@example.com', password: 'super-secret' })
      .expect(201);
    const secondRes = await request(app.getHttpServer())
      .post('/riders')
      .send({ name: 'Wants Taken Phone', phone: '+911234515151', email: 'wants-taken-phone@example.com', password: 'super-secret' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/riders/${secondRes.body.id}`)
      .send({ phone: '+911234514141' })
      .expect(409);
  });

  it('PATCH /riders/:id returns 404 for an unknown rider', async () => {
    await request(app.getHttpServer()).patch(`/riders/${randomUUID()}`).send({ name: 'Nobody' }).expect(404);
  });

  it('persists across a fresh Prisma connection (proves it is not in-memory)', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/riders')
      .send({
        name: 'Restart Check',
        phone: '+919999999999',
        email: 'restart-check@example.com',
        password: 'super-secret',
      })
      .expect(201);

    const secondModuleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const secondApp = secondModuleRef.createNestApplication();
    await secondApp.init();

    await request(secondApp.getHttpServer())
      .get(`/riders/${createRes.body.id}`)
      .expect(200);

    await secondApp.close();
  });

  it('rejects a malformed create request with 400', async () => {
    await request(app.getHttpServer()).post('/riders').send({ name: '' }).expect(400);
  });

  it('rejects registration with an invalid email with 400', async () => {
    await request(app.getHttpServer())
      .post('/riders')
      .send({ name: 'Bad Email', phone: '+911234511111', email: 'not-an-email', password: 'super-secret' })
      .expect(400);
  });

  it('returns 404 for an unknown rider', async () => {
    await request(app.getHttpServer()).get(`/riders/${randomUUID()}`).expect(404);
  });

  it('returns 404 from POST /rides for an unknown rider (no event published)', async () => {
    await request(app.getHttpServer())
      .post('/rides')
      .send({
        riderId: randomUUID(),
        pickup: { lat: 12.9716, lng: 77.5946 },
        destination: { lat: 12.9352, lng: 77.6146 },
      })
      .expect(404);
  });

  it('POST /rides publishes a ride.requested event carrying the same correlation id, and returns 202 immediately', async () => {
    const riderRes = await request(app.getHttpServer())
      .post('/riders')
      .send({
        name: 'Kafka Test Rider',
        phone: '+911234500000',
        email: 'kafka-test-rider@example.com',
        password: 'super-secret',
      })
      .expect(201);
    const riderId = riderRes.body.id;
    const correlationId = randomUUID();

    // Subscribe before publishing so we don't race the message.
    const testKafka = createKafkaClient({ clientId: 'test-consumer', brokers: [bootstrapServers(kafka)] });
    const consumer = new EventConsumer(testKafka, `test-${randomUUID()}`);
    await consumer.connect();
    await consumer.subscribe(['ride.requested']);

    const received: Promise<EventEnvelope> = new Promise((resolve) => {
      void consumer.run(async (envelope) => {
        if (envelope.correlationId === correlationId) {
          resolve(envelope);
        }
      });
    });

    const createRes = await request(app.getHttpServer())
      .post('/rides')
      .set('x-correlation-id', correlationId)
      .send({
        riderId,
        pickup: { lat: 12.9716, lng: 77.5946 },
        destination: { lat: 12.9352, lng: 77.6146 },
      })
      .expect(202);

    expect(createRes.body.status).toBe('REQUESTED');
    expect(createRes.body.rideId).toBeDefined();

    const envelope = await received;
    expect(envelope.eventType).toBe('ride.requested');
    expect(envelope.producer).toBe('rider-service');
    expect((envelope.payload as { rideId: string }).rideId).toBe(createRes.body.rideId);
    expect((envelope.payload as { riderId: string }).riderId).toBe(riderId);

    await consumer.disconnect();
  }, 30000);

  it('POST /rides/:id/cancel publishes a ride.cancelled event', async () => {
    const rideId = randomUUID();
    const correlationId = randomUUID();

    const testKafka = createKafkaClient({ clientId: 'test-consumer-2', brokers: [bootstrapServers(kafka)] });
    const consumer = new EventConsumer(testKafka, `test-${randomUUID()}`);
    await consumer.connect();
    await consumer.subscribe(['ride.cancelled']);

    const received: Promise<EventEnvelope> = new Promise((resolve) => {
      void consumer.run(async (envelope) => {
        if (envelope.correlationId === correlationId) {
          resolve(envelope);
        }
      });
    });

    const cancelRes = await request(app.getHttpServer())
      .post(`/rides/${rideId}/cancel`)
      .set('x-correlation-id', correlationId)
      .send({ reason: 'RIDER_CANCELLED' })
      .expect(202);

    expect(cancelRes.body.status).toBe('CANCELLATION_REQUESTED');

    const envelope = await received;
    expect(envelope.eventType).toBe('ride.cancelled');
    expect((envelope.payload as { rideId: string }).rideId).toBe(rideId);
    expect((envelope.payload as { reason: string }).reason).toBe('RIDER_CANCELLED');

    await consumer.disconnect();
  }, 30000);

  it('registers a rider and logs in by phone with the same credentials, returning a bearer token', async () => {
    await request(app.getHttpServer())
      .post('/riders')
      .send({
        name: 'Login Test Rider',
        phone: '+911234599999',
        email: 'login-test-rider@example.com',
        password: 'correct-horse',
      })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/riders/login')
      .send({ identifier: '+911234599999', password: 'correct-horse' })
      .expect(200);

    expect(typeof loginRes.body.accessToken).toBe('string');
    expect(loginRes.body.rider.phone).toBe('+911234599999');
    expect(loginRes.body.rider.email).toBe('login-test-rider@example.com');
    expect(loginRes.body.rider.passwordHash).toBeUndefined();
  });

  it('logs in by email as well as phone', async () => {
    await request(app.getHttpServer())
      .post('/riders')
      .send({
        name: 'Email Login Rider',
        phone: '+911234577777',
        email: 'email-login-rider@example.com',
        password: 'correct-horse',
      })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/riders/login')
      .send({ identifier: 'email-login-rider@example.com', password: 'correct-horse' })
      .expect(200);

    expect(loginRes.body.rider.email).toBe('email-login-rider@example.com');
  });

  it('rejects login with the wrong password with 401', async () => {
    await request(app.getHttpServer())
      .post('/riders')
      .send({
        name: 'Wrong Password Rider',
        phone: '+911234588888',
        email: 'wrong-password-rider@example.com',
        password: 'correct-horse',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/riders/login')
      .send({ identifier: '+911234588888', password: 'wrong-password' })
      .expect(401);
  });

  it('rejects login for an unregistered identifier with 401', async () => {
    await request(app.getHttpServer())
      .post('/riders/login')
      .send({ identifier: '+910000000000', password: 'whatever' })
      .expect(401);
  });
});
