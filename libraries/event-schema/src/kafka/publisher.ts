import { randomUUID } from 'node:crypto';
import type { Kafka, Producer } from 'kafkajs';
import { EventEnvelope } from '../events';

export interface PublishOptions {
  correlationId?: string;
  /** Kafka partition key — e.g. driverId for driver.* topics (see overview.md's partition strategy). */
  key?: string;
}

/**
 * Thin wrapper so every producer builds the same envelope shape
 * (docs/roadmap/PHASES.md Phase 5) instead of each service re-implementing
 * it slightly differently.
 */
export class EventPublisher {
  private readonly producer: Producer;
  private connected = false;

  constructor(
    kafka: Kafka,
    private readonly producerName: string,
  ) {
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await this.producer.connect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    await this.producer.disconnect();
    this.connected = false;
  }

  async publish<TPayload>(
    topic: string,
    eventType: string,
    payload: TPayload,
    options: PublishOptions = {},
  ): Promise<EventEnvelope<TPayload>> {
    const envelope: EventEnvelope<TPayload> = {
      eventId: randomUUID(),
      eventType,
      version: 1,
      timestamp: new Date().toISOString(),
      correlationId: options.correlationId ?? randomUUID(),
      producer: this.producerName,
      payload,
    };

    await this.producer.send({
      topic,
      messages: [
        {
          key: options.key,
          value: JSON.stringify(envelope),
          headers: {
            correlationId: envelope.correlationId,
            eventType,
          },
        },
      ],
    });

    return envelope;
  }
}
