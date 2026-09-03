import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DEFAULT_JWT_SECRET } from '../src/auth/auth.module';
import { AppModule } from '../src/app.module';

describe('API Gateway (e2e)', () => {
  let app: INestApplication;
  let fakeUpstream: http.Server;
  let riderToken: string;
  let driverToken: string;

  beforeAll(async () => {
    fakeUpstream = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        if (req.method === 'POST' && req.url === '/riders') {
          res.writeHead(201, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ id: 'fake-id', receivedCorrelationId: req.headers['x-correlation-id'] }));
          return;
        }
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ statusCode: 404 }));
      });
    });
    await new Promise<void>((resolve) => fakeUpstream.listen(0, resolve));
    const { port } = fakeUpstream.address() as AddressInfo;
    process.env.RIDER_SERVICE_URL = `http://localhost:${port}`;
    // Deliberately left unreachable so the 502 test below exercises a real failure.
    process.env.DRIVER_SERVICE_URL = 'http://localhost:1';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const jwt = new JwtService({ secret: process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET });
    riderToken = await jwt.signAsync({ sub: 'rider-1', role: 'rider', phone: '+919876543210' });
    // sub matches the 'some-id' path param the tests below hit — RBAC's
    // ownership check (Phase 11) requires GET /drivers/:id's :id to equal the
    // token's own sub, since any driver role alone isn't the *right* driver.
    driverToken = await jwt.signAsync({ sub: 'some-id', role: 'driver', phone: '+919876500000' });
  });

  afterAll(async () => {
    await app.close();
    await new Promise<void>((resolve) => fakeUpstream.close(() => resolve()));
  });

  it('GET /health/live is served by the gateway itself, not proxied', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200);
  });

  it('proxies POST /riders to the rider service and forwards a correlation id', async () => {
    const res = await request(app.getHttpServer()).post('/riders').send({ name: 'Test' }).expect(201);
    expect(res.body.id).toBe('fake-id');
    expect(res.body.receivedCorrelationId).toBeDefined();
    expect(res.headers['x-correlation-id']).toBeDefined();
  });

  it('returns 404 for a path with no configured route', async () => {
    await request(app.getHttpServer()).get('/unknown').expect(404);
  });

  it('rejects a protected route with 401 when no bearer token is supplied', async () => {
    await request(app.getHttpServer()).get('/drivers/some-id').expect(401);
  });

  it('rejects a protected route with 401 when the bearer token is invalid', async () => {
    await request(app.getHttpServer())
      .get('/drivers/some-id')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('returns 502 when the upstream service is unreachable, given a valid token', async () => {
    await request(app.getHttpServer())
      .get('/drivers/some-id')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(502);
  });

  it('rejects a role not permitted for the route with 403', async () => {
    // GET /drivers/:id is driver/operator-only (RBAC, Phase 11) — a rider
    // token is valid but not the right role.
    await request(app.getHttpServer())
      .get('/drivers/some-id')
      .set('Authorization', `Bearer ${riderToken}`)
      .expect(403);
  });

  it('rejects one driver acting on another driver\'s resource with 403', async () => {
    // driverToken's sub is 'some-id' — a different :id is the right role but
    // the wrong resource, which RBAC's ownership check (Phase 11) catches.
    await request(app.getHttpServer())
      .get('/drivers/a-different-driver-id')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(403);
  });

  it('rejects a rider PATCHing another rider\'s profile with 403', async () => {
    // riderToken's sub is 'rider-1' (see beforeAll) — a different :id is the
    // right role but the wrong resource, same ownership check as the drivers
    // case above, now covering the profile-update route added alongside the
    // rider/driver profile + booking-history feature.
    await request(app.getHttpServer())
      .patch('/riders/a-different-rider-id')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ name: 'New Name' })
      .expect(403);
  });

  it('allows a rider to PATCH their own profile (RBAC passes, request reaches the upstream)', async () => {
    // fakeUpstream only handles POST /riders explicitly and 404s everything
    // else — a 404 here (not 401/403) proves RBAC let the request through to
    // the rider service rather than blocking it.
    await request(app.getHttpServer())
      .patch('/riders/rider-1')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ name: 'New Name' })
      .expect(404);
  });

  it('rejects a driver PATCHing another driver\'s profile with 403', async () => {
    await request(app.getHttpServer())
      .patch('/drivers/a-different-driver-id')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ name: 'New Name' })
      .expect(403);
  });

  it('rejects a rider reading another rider\'s trip history with 403', async () => {
    await request(app.getHttpServer())
      .get('/trips/rider/a-different-rider-id/history')
      .set('Authorization', `Bearer ${riderToken}`)
      .expect(403);
  });

  it('rejects a driver reading another driver\'s trip history with 403', async () => {
    await request(app.getHttpServer())
      .get('/trips/driver/a-different-driver-id/history')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(403);
  });

  it('allows a driver to read their own trip history (RBAC passes, request reaches the upstream)', async () => {
    // TRIP_SERVICE_URL isn't stubbed in this suite, so a passed-through
    // request fails to connect — 502, not 401/403 — proving RBAC let it
    // through rather than blocking it (same reasoning as the 502 test above).
    await request(app.getHttpServer())
      .get('/trips/driver/some-id/history')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(502);
  });

  it('rejects a driver reading a trip\'s pickup OTP with 403 — otp is rider-only', async () => {
    await request(app.getHttpServer())
      .get('/trips/some-trip-id/otp')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(403);
  });

  it('allows a rider to read a trip\'s pickup OTP (RBAC passes, request reaches the upstream)', async () => {
    // Same reasoning as the driver-history 502 test above: TRIP_SERVICE_URL
    // is unreachable in this suite, so getting past RBAC surfaces as 502.
    await request(app.getHttpServer())
      .get('/trips/some-trip-id/otp')
      .set('Authorization', `Bearer ${riderToken}`)
      .expect(502);
  });
});
