import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Trip Service (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('ridemesh_trips_test')
      .withUsername('ridemesh')
      .withPassword('ridemesh')
      .start();

    process.env.DATABASE_URL = container.getConnectionUri();

    execSync('npx prisma migrate deploy', { env: { ...process.env }, stdio: 'inherit' });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  const tripPayload = () => ({
    riderId: randomUUID(),
    pickup: { lat: 12.9716, lng: 77.5946 },
    destination: { lat: 12.9352, lng: 77.6146 },
  });

  it('GET /health/live and /health/ready return 200', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200);
    await request(app.getHttpServer()).get('/health/ready').expect(200);
  });

  it('creates a trip which lands in MATCHING (REQUESTED -> MATCHING applied synchronously in Phase 2/3)', async () => {
    const res = await request(app.getHttpServer()).post('/trips').send(tripPayload()).expect(201);
    expect(res.body.status).toBe('MATCHING');

    const getRes = await request(app.getHttpServer()).get(`/trips/${res.body.id}`).expect(200);
    expect(getRes.body.status).toBe('MATCHING');
  });

  it('persists across a fresh Prisma connection and records trip_events audit rows', async () => {
    const createRes = await request(app.getHttpServer()).post('/trips').send(tripPayload()).expect(201);
    const id = createRes.body.id;

    await request(app.getHttpServer())
      .post(`/trips/${id}/cancel`)
      .send({ reason: 'RIDER_CANCELLED' })
      .expect(201);

    const secondModuleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const secondApp = secondModuleRef.createNestApplication();
    await secondApp.init();

    const getRes = await request(secondApp.getHttpServer()).get(`/trips/${id}`).expect(200);
    expect(getRes.body.status).toBe('CANCELLED');
    expect(getRes.body.cancellationReason).toBe('RIDER_CANCELLED');

    await secondApp.close();

    const prisma = app.get(PrismaService);
    const events = await prisma.tripEvent.findMany({ where: { rideId: id } });
    const eventTypes = events.map((event) => event.eventType).sort();
    expect(eventTypes).toEqual(['ride.cancelled', 'ride.matching', 'ride.requested'].sort());
  });

  it('rejects a malformed create request with 400', async () => {
    await request(app.getHttpServer())
      .post('/trips')
      .send({ riderId: 'not-a-uuid', pickup: { lat: 999, lng: 0 }, destination: { lat: 0, lng: 0 } })
      .expect(400);
  });

  it('returns 404 for an unknown trip', async () => {
    await request(app.getHttpServer()).get(`/trips/${randomUUID()}`).expect(404);
  });

  it('rejects driver-arrived on a MATCHING trip with 409, not 500 (no dispatch/acceptance yet)', async () => {
    const res = await request(app.getHttpServer()).post('/trips').send(tripPayload()).expect(201);
    await request(app.getHttpServer()).post(`/trips/${res.body.id}/driver-arrived`).expect(409);
  });

  it('cancels a MATCHING trip and records the cancellation reason', async () => {
    const res = await request(app.getHttpServer()).post('/trips').send(tripPayload()).expect(201);

    const cancelRes = await request(app.getHttpServer())
      .post(`/trips/${res.body.id}/cancel`)
      .send({ reason: 'RIDER_CANCELLED' })
      .expect(201);

    expect(cancelRes.body.status).toBe('CANCELLED');
    expect(cancelRes.body.cancellationReason).toBe('RIDER_CANCELLED');
  });

  it('rejects cancelling an already-cancelled (terminal) trip with 409', async () => {
    const res = await request(app.getHttpServer()).post('/trips').send(tripPayload()).expect(201);
    await request(app.getHttpServer()).post(`/trips/${res.body.id}/cancel`).send({}).expect(201);
    await request(app.getHttpServer()).post(`/trips/${res.body.id}/cancel`).send({}).expect(409);
  });
});
