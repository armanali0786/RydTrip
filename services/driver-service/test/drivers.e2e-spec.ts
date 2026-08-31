import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Driver Service (e2e)', () => {
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
      .send({ name: 'Ravi Kumar', phone: '+911111111111', vehicleType: 'AUTO' })
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
