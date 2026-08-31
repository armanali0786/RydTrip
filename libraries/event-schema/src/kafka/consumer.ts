import type { Consumer, EachMessagePayload, Kafka } from 'kafkajs';
import { EventEnvelope } from '../events';

export type EventHandler<TPayload = unknown> = (
  envelope: EventEnvelope<TPayload>,
  raw: EachMessagePayload,
) => Promise<void>;

/**
 * Thin wrapper around KafkaJS's consumer. No offset-management logic here
 * beyond KafkaJS's own defaults (auto-commit after a successful
 * eachMessage) — that default is exactly what Phase 5's exit criterion
 * relies on: killing and restarting a consumer resumes from the last
 * committed offset. Idempotent processing (surviving *duplicate* delivery)
 * is a deliberately separate concern, added in Phase 8 — this class does
 * not attempt it.
 */
export class EventConsumer {
  private readonly consumer: Consumer;

  constructor(
    private readonly kafka: Kafka,
    groupId: string,
  ) {
    this.consumer = kafka.consumer({ groupId });
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }

  /**
   * Explicitly creates each topic (if missing) and waits for its partition
   * leader to be elected before subscribing. Relying on implicit
   * auto-create-on-subscribe is flaky against a just-started broker — the
   * metadata request that triggers creation can return before leader
   * election finishes, surfacing as "This server does not host this
   * topic-partition" on the very next subscribe/fetch.
   */
  async subscribe(topics: string[]): Promise<void> {
    const admin = this.kafka.admin();
    await admin.connect();
    try {
      await admin.createTopics({
        topics: topics.map((topic) => ({ topic, numPartitions: 1, replicationFactor: 1 })),
        waitForLeaders: true,
      });
    } finally {
      await admin.disconnect();
    }

    await this.consumer.subscribe({ topics, fromBeginning: false });
  }

  async run(handler: EventHandler): Promise<void> {
    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const raw = payload.message.value?.toString();
        if (!raw) {
          return;
        }

        let envelope: EventEnvelope;
        try {
          envelope = JSON.parse(raw) as EventEnvelope;
        } catch (err) {
          // Malformed message. Phase 8 adds a Dead Letter Topic for this;
          // for now, log and move on rather than crash the consumer loop.
          // eslint-disable-next-line no-console
          console.error('Failed to parse event envelope, skipping message', err);
          return;
        }

        await handler(envelope, payload);
      },
    });
  }
}
