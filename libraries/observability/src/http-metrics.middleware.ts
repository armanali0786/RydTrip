import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { Counter, Histogram, register } from 'prom-client';

// getSingleMetric guards re-registration: a test suite that spins up a second
// Nest application in the same process (several e2e specs in this repo do,
// to prove state survived a fresh connection) would otherwise hit
// prom-client's "metric already registered" error the second time this
// module is instantiated.
function getOrCreateHistogram(): Histogram<'method' | 'route' | 'status_code'> {
  const existing = register.getSingleMetric('http_request_duration_seconds');
  if (existing) {
    return existing as Histogram<'method' | 'route' | 'status_code'>;
  }
  return new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  });
}

function getOrCreateCounter(): Counter<'method' | 'route' | 'status_code'> {
  const existing = register.getSingleMetric('http_requests_total');
  if (existing) {
    return existing as Counter<'method' | 'route' | 'status_code'>;
  }
  return new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests handled',
    labelNames: ['method', 'route', 'status_code'],
  });
}

const httpRequestDuration = getOrCreateHistogram();
const httpRequestTotal = getOrCreateCounter();

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      // req.route is only populated once Express has matched a route, which
      // has already happened by the time 'finish' fires (post-response) —
      // it's the correct place to read it despite this middleware running
      // ahead of routing in the chain.
      const route = req.route?.path ?? req.path;
      const labels = { method: req.method, route, status_code: String(res.statusCode) };
      const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;

      httpRequestDuration.observe(labels, durationSeconds);
      httpRequestTotal.inc(labels);
    });

    next();
  }
}
