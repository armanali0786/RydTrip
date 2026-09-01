import { Module } from '@nestjs/common';
import { MetricsModule } from '@rydtrip/observability';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ProxyModule } from './proxy/proxy.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';

@Module({
  // HealthModule and MetricsModule first: their literal routes must register
  // before ProxyModule's catch-all wildcard, or the wildcard would shadow
  // them. RateLimitModule and AuthModule each register a global guard
  // (APP_GUARD) — Nest runs multiple global guards in registration order, so
  // RateLimitModule comes first: a flood gets rejected on a cheap in-memory
  // counter check before a JWT gets verified. See jwt-auth.guard.ts for which
  // routes AuthModule treats as public, and rate-limit.guard.ts for the
  // per-route limit tiers.
  imports: [HealthModule, MetricsModule, RateLimitModule, AuthModule, ProxyModule],
})
export class AppModule {}
