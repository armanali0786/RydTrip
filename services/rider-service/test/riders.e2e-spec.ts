import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';

describe('Rider Service (e2e)', () => {
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

  it('GET /health/live and /health/ready return 200', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200);
    await request(app.getHttpServer()).get('/health/ready').expect(200);
  });

  it('creates a rider and fetches it', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/riders')
      .send({ name: 'Priya Sharma', phone: '+919876543210' })
      .expect(201);

    expect(createRes.body.id).toBeDefined();

    const getRes = await request(app.getHttpServer())
      .get(`/riders/${createRes.body.id}`)
      .expect(200);
    expect(getRes.body.name).toBe('Priya Sharma');
  });

  it('rejects a malformed create request with 400', async () => {
    await request(app.getHttpServer()).post('/riders').send({ name: '' }).expect(400);
  });

  it('returns 404 for an unknown rider', async () => {
    await request(app.getHttpServer()).get(`/riders/${randomUUID()}`).expect(404);
  });
});
