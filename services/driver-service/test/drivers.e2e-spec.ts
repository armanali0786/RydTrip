import { execSync } from 'node:child_process';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { AppModule } from '../src/app.module';

const VALID_KYC_FIELDS = {
  city: 'Hyderabad',
  licenseNumber: 'DL-0420110149646',
  vehicleRegistrationNumber: 'TS09EA1234',
  insurancePolicyNumber: 'POL-889233445',
};

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
      .send({
        name: 'Asha Rao',
        phone: '+919812345670',
        email: 'asha@example.com',
        password: 'super-secret',
        vehicleType: 'SEDAN',
        ...VALID_KYC_FIELDS,
      })
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
      .send({
        name: 'Restart Check',
        phone: '+919812399999',
        email: 'restart-check-driver@example.com',
        password: 'super-secret',
        vehicleType: 'AUTO',
        ...VALID_KYC_FIELDS,
      })
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

  it('rejects registration with an invalid email with 400', async () => {
    await request(app.getHttpServer())
      .post('/drivers')
      .send({
        name: 'Bad Email',
        phone: '+911234511112',
        email: 'not-an-email',
        password: 'super-secret',
        vehicleType: 'SEDAN',
        ...VALID_KYC_FIELDS,
      })
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
      .send({
        name: 'Ravi Kumar',
        phone: '+911111111112',
        email: 'ravi.kumar@example.com',
        password: 'super-secret',
        vehicleType: 'AUTO',
        ...VALID_KYC_FIELDS,
      })
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

  it('registers a driver and logs in by phone with the same credentials, returning a bearer token', async () => {
    await request(app.getHttpServer())
      .post('/drivers')
      .send({
        name: 'Login Test Driver',
        phone: '+911234599998',
        email: 'login-test-driver@example.com',
        password: 'correct-horse',
        vehicleType: 'SEDAN',
        ...VALID_KYC_FIELDS,
      })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/drivers/login')
      .send({ identifier: '+911234599998', password: 'correct-horse' })
      .expect(200);

    expect(typeof loginRes.body.accessToken).toBe('string');
    expect(loginRes.body.driver.phone).toBe('+911234599998');
    expect(loginRes.body.driver.email).toBe('login-test-driver@example.com');
    expect(loginRes.body.driver.passwordHash).toBeUndefined();
  });

  it('logs in by email as well as phone', async () => {
    await request(app.getHttpServer())
      .post('/drivers')
      .send({
        name: 'Email Login Driver',
        phone: '+911234577778',
        email: 'email-login-driver@example.com',
        password: 'correct-horse',
        vehicleType: 'SEDAN',
        ...VALID_KYC_FIELDS,
      })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/drivers/login')
      .send({ identifier: 'email-login-driver@example.com', password: 'correct-horse' })
      .expect(200);

    expect(loginRes.body.driver.email).toBe('email-login-driver@example.com');
  });

  it('rejects login with the wrong password with 401', async () => {
    await request(app.getHttpServer())
      .post('/drivers')
      .send({
        name: 'Wrong Password Driver',
        phone: '+911234588887',
        email: 'wrong-password-driver@example.com',
        password: 'correct-horse',
        vehicleType: 'SEDAN',
        ...VALID_KYC_FIELDS,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/drivers/login')
      .send({ identifier: '+911234588887', password: 'wrong-password' })
      .expect(401);
  });

  it('rejects login for an unregistered identifier with 401', async () => {
    await request(app.getHttpServer())
      .post('/drivers/login')
      .send({ identifier: '+910000000001', password: 'whatever' })
      .expect(401);
  });
});
