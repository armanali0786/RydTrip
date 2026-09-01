import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { collectDefaultMetrics, register } from 'prom-client';
import { HttpMetricsMiddleware } from './http-metrics.middleware';
import { MetricsController } from './metrics.controller';

let defaultMetricsStarted = false;

/** Exposes GET /metrics (Prometheus exposition format) and records a request-duration histogram for every route. */
@Module({
  controllers: [MetricsController],
})
export class MetricsModule implements NestModule {
  constructor() {
    if (!defaultMetricsStarted) {
      collectDefaultMetrics({ register });
      defaultMetricsStarted = true;
    }
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HttpMetricsMiddleware).forRoutes('*');
  }
}
