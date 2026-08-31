import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createKafkaClient, EventPublisher } from '@rydtrip/event-schema';

@Injectable()
export class KafkaPublisherService extends EventPublisher implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const kafka = createKafkaClient({
      clientId: 'rider-service',
      brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    });
    super(kafka, 'rider-service');
  }

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }
}
