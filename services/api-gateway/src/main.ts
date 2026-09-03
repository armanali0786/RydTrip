import './tracing';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Wide open for local dev (apps/web, apps/rider-web, apps/driver-web all
  // hit this gateway from their own vite ports) — tighten to an explicit
  // origin allowlist before this goes anywhere near production (Phase 11).
  app.enableCors({ origin: true, credentials: true });

  // RateLimitGuard (Phase 12) keys on req.ip — without this, Express reports
  // the immediate connection's address for every request, which behind a
  // real load balancer (Phase 13's ALB) is always the LB itself, collapsing
  // every distinct client into one shared bucket. `1` trusts exactly one
  // hop's X-Forwarded-For, matching a single reverse proxy in front.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  const config = new DocumentBuilder()
    .setTitle('API Gateway')
    .setDescription(
      'RydTrip API Gateway — routes /riders, /drivers, /trips to their owning ' +
        'services and injects a correlation ID. Holds no domain schema of its own; ' +
        'see each downstream service for its OpenAPI spec at /docs.',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`api-gateway listening on port ${port}`);
}

bootstrap();
