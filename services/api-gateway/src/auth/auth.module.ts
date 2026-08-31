import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

// Same fallback used by rider-service/driver-service when JWT_SECRET isn't
// set — keeps a from-scratch `npm run start:dev` usable without an .env file,
// same as this repo's other local-dev defaults (e.g. KAFKA_BROKERS).
export const DEFAULT_JWT_SECRET = 'dev-shared-secret-change-me';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET,
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AuthModule {}
