import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('API Gateway (e2e)', () => {
  let app: INestApplication;
  let fakeUpstream: http.Server;

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

  it('returns 502 when the upstream service is unreachable', async () => {
    await request(app.getHttpServer()).get('/drivers/some-id').expect(502);
  });
});
