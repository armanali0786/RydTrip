import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Dispatch Service')
    .setDescription(
      'RydTrip Dispatch Service — consumes ride.requested, queries Redis GEO for ' +
        'nearby drivers, and performs atomic reservation. Holds no HTTP domain API of ' +
        'its own; it emits events that Trip Service consumes (see overview.md).',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ? Number(process.env.PORT) : 3005;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`dispatch-service listening on port ${port}`);
}

bootstrap();
