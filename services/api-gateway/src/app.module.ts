import { Module } from '@nestjs/common';
import { MetricsModule } from '@rydtrip/observability';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ProxyModule } from './proxy/proxy.module';

@Module({
  // HealthModule and MetricsModule first: their literal routes must register
  // before ProxyModule's catch-all wildcard, or the wildcard would shadow
  // them. AuthModule registers a global guard (APP_GUARD) — see
  // jwt-auth.guard.ts for which routes it treats as public.
  imports: [HealthModule, MetricsModule, AuthModule, ProxyModule],
})
export class AppModule {}
