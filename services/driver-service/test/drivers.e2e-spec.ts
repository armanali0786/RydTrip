import { execSync } from 'node:child_process';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Driver Service (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('rydtrip_drivers_test')
      .withUsername('rydtrip')
      .withPassword('rydtrip')
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

  it('GET /health/live and /health/ready return 200', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200);
    await request(app.getHttpServer()).get('/health/ready').expect(200);
  });

  it('creates a driver in OFFLINE status and fetches it', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/drivers')
      .send({ name: 'Asha Rao', phone: '+919812345670', vehicleType: 'SEDAN' })
      .expect(201);

    expect(createRes.body.status).toBe('OFFLINE');
    expect(createRes.body.id).toBeDefined();

    const getRes = await request(app.getHttpServer())
      .get(`/drivers/${createRes.body.id}`)
      .expect(200);
    expect(getRes.body.phone).toBe('+919812345670');
  });

  it('persists a status transition across a fresh Prisma connection (proves it is not in-memory)', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/drivers')
      .send({ name: 'Restart Check', phone: '+919812399999', vehicleType: 'AUTO' })
      .expect(201);
    const id = createRes.body.id;

    await request(app.getHttpServer())
      .patch(`/drivers/${id}/status`)
      .send({ status: 'AVAILABLE' })
      .expect(200);

    const secondModuleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const secondApp = secondModuleRef.createNestApplication();
    await secondApp.init();

    const getRes = await request(secondApp.getHttpServer()).get(`/drivers/${id}`).expect(200);
    expect(getRes.body.status).toBe('AVAILABLE');

    await secondApp.close();
  });

  it('rejects a malformed create request with 400', async () => {
    await request(app.getHttpServer())
      .post('/drivers')
      .send({ name: '', phone: '+911111111111', vehicleType: 'SPACESHIP' })
      .expect(400);
  });

  it('returns 404 for an unknown driver', async () => {
    await request(app.getHttpServer())
      .get('/drivers/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });

  it('allows OFFLINE -> AVAILABLE and rejects OFFLINE -> RESERVED with 409', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/drivers')
      .send({ name: 'Ravi Kumar', phone: '+911111111112', vehicleType: 'AUTO' })
      .expect(201);
    const id = createRes.body.id;

    await request(app.getHttpServer())
      .patch(`/drivers/${id}/status`)
      .send({ status: 'RESERVED' })
      .expect(409);

    const okRes = await request(app.getHttpServer())
      .patch(`/drivers/${id}/status`)
      .send({ status: 'AVAILABLE' })
      .expect(200);
    expect(okRes.body.status).toBe('AVAILABLE');
  });
});
