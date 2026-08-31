import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Location Service')
    .setDescription(
      'RydTrip Location Service — the only writer of driver location into Redis GEO. ' +
        'Accepts high-frequency driver pings and publishes driver.location.updated.',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ? Number(process.env.PORT) : 3004;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`location-service listening on port ${port}`);
}

bootstrap();
