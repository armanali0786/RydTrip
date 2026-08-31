import type Redis from 'ioredis';

function processedKey(consumerName: string, eventId: string): string {
  return `processed:${consumerName}:${eventId}`;
}

/**
 * Redis-backed idempotency ledger for consumers that own no Postgres
 * database of their own (Dispatch Service) — same role as Trip Service's
 * `processed_events` table (see docs/architecture/data-model.md), just
 * backed by Redis instead of Postgres. Consistent with ADR-004's
 * per-service data ownership applied to Redis key space (Phase 6/7).
 *
 * A plain key with a TTL, not a Postgres unique-constraint insert, so
 * "already processed" here means "seen within the last `ttlSeconds`" rather
 * than "seen ever" — acceptable since replay/redelivery windows are bounded
 * (Kafka retention, DLT replay tooling) and unlike `processed_events` this
 * never needs to be queried for anything but membership.
 */
export class IdempotencyStore {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds = 24 * 60 * 60,
  ) {}

  async wasProcessed(consumerName: string, eventId: string): Promise<boolean> {
    const value = await this.redis.get(processedKey(consumerName, eventId));
    return value !== null;
  }

  async markProcessed(consumerName: string, eventId: string): Promise<void> {
    await this.redis.set(processedKey(consumerName, eventId), '1', 'EX', this.ttlSeconds);
  }
}
