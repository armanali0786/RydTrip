import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { ProxyModule } from './proxy/proxy.module';

@Module({
  // HealthModule first: its literal /health/* routes must register before
  // ProxyModule's catch-all wildcard, or the wildcard would shadow them.
  imports: [HealthModule, ProxyModule],
})
export class AppModule {}
