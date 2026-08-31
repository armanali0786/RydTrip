import { Injectable } from '@nestjs/common';
import { KAFKA_TOPICS } from '@rydtrip/event-schema';
import { NearbyDriver } from '@rydtrip/redis-client';
import { KafkaPublisherService } from '../kafka/kafka-publisher.service';
import { RedisService } from '../redis/redis.service';

const DEFAULT_HEARTBEAT_TTL_SECONDS = 30;

@Injectable()
export class LocationsService {
  private readonly heartbeatTtlSeconds =
    Number(process.env.DRIVER_HEARTBEAT_TTL_SECONDS) || DEFAULT_HEARTBEAT_TTL_SECONDS;

  constructor(
    private readonly redis: RedisService,
    private readonly kafkaPublisher: KafkaPublisherService,
  ) {}

  async updateLocation(driverId: string, lat: number, lng: number, correlationId: string): Promise<void> {
    await this.redis.upsertLocation(driverId, lat, lng, this.heartbeatTtlSeconds);

    await this.kafkaPublisher.publish(
      KAFKA_TOPICS.DRIVER_LOCATION_UPDATED,
      KAFKA_TOPICS.DRIVER_LOCATION_UPDATED,
      { driverId, lat, lng },
      { correlationId, key: driverId },
    );
  }

  async findNearby(lat: number, lng: number, radiusKm: number, limit: number): Promise<NearbyDriver[]> {
    return this.redis.findNearby(lat, lng, radiusKm, limit);
  }
}
