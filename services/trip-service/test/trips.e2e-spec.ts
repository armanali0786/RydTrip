import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';

describe('Trip Service (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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

  it('creates a trip which lands in MATCHING (REQUESTED -> MATCHING applied synchronously in Phase 2)', async () => {
    const res = await request(app.getHttpServer()).post('/trips').send(tripPayload()).expect(201);
    expect(res.body.status).toBe('MATCHING');

    const getRes = await request(app.getHttpServer()).get(`/trips/${res.body.id}`).expect(200);
    expect(getRes.body.status).toBe('MATCHING');
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
