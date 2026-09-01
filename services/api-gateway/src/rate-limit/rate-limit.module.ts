import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';

// Registered as an APP_GUARD ahead of AuthModule's (see app.module.ts's
// import order) so a flood gets rejected on a cheap in-memory counter check
// before spending a JWT verification on it.
@Module({
  providers: [{ provide: APP_GUARD, useClass: RateLimitGuard }],
})
export class RateLimitModule {}
