import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Rider Service (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('ridemesh_riders_test')
      .withUsername('ridemesh')
      .withPassword('ridemesh')
      .start();

    process.env.DATABASE_URL = container.getConnectionUri();

    // Proves migrations are reproducible from a clean database (Phase 3 exit
    // criterion), not just that the app happens to work against a
    // hand-migrated dev database.
    execSync('npx prisma migrate deploy', {
      env: { ...process.env },
      stdio: 'inherit',
    });

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

  it('persists across a fresh Prisma connection (proves it is not in-memory)', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/riders')
      .send({ name: 'Restart Check', phone: '+919999999999' })
      .expect(201);

    // A second, independently-created Nest application against the same
    // database stands in for "the service restarted" — if data lived in a
    // process-local Map (Phase 2), this second app would not see it.
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

  it('returns 404 for an unknown rider', async () => {
    await request(app.getHttpServer()).get(`/riders/${randomUUID()}`).expect(404);
  });
});
