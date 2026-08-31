import type { Consumer, EachMessagePayload, Kafka, Producer } from 'kafkajs';
import { EventEnvelope } from '../events';

export type EventHandler<TPayload = unknown> = (
  envelope: EventEnvelope<TPayload>,
  raw: EachMessagePayload,
) => Promise<void>;

export interface RetryOptions {
  /** Total attempts (including the first) before a message is parked on the DLT. Default 3. */
  maxAttempts?: number;
  /** Base delay for the first retry, in ms. Default 200. */
  baseDelayMs?: number;
  /** Ceiling on the backoff delay, in ms, before jitter is applied. Default 5000. */
  maxDelayMs?: number;
}

/** Shape of a record parked on a `<groupId>.dlt` topic — see EventConsumer's docstring. */
export interface DlqRecord {
  dlqReason: 'malformed-json' | 'handler-failed';
  consumerGroup: string;
  originalTopic: string;
  originalPartition: number;
  originalOffset: string;
  originalKey: string | null;
  attempts: number;
  errorMessage: string;
  failedAt: string;
  envelope: EventEnvelope | null;
  /** Only set when dlqReason is 'malformed-json', since there's no envelope to carry it in. */
  rawValue: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Full-jitter exponential backoff: a random delay in [0, min(maxDelayMs, base * 2^(attempt-1))]. */
function backoffDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
  return Math.random() * cap;
}

/**
 * Thin wrapper around KafkaJS's consumer. Offset management is KafkaJS's own
 * default (auto-commit after eachMessage resolves) — that default is what
 * Phase 5's exit criterion relies on: killing and restarting a consumer
 * resumes from the last committed offset.
 *
 * Phase 8 adds two reliability layers on top, both generic to every
 * consumer built on this class:
 *  - Retry with exponential backoff + full jitter around the handler call,
 *    for transient failures (a downstream service being briefly unreachable,
 *    a cross-service race like driver.accepted arriving before this
 *    service's own ride.requested consumer has committed the ride row).
 *  - A Dead Letter Topic per consumer group (`<groupId>.dlt`, created
 *    automatically the first time it's actually needed — no extra wiring at
 *    call sites, and no cost for consumers that never park anything) that a
 *    message lands on once retries are exhausted, carrying enough metadata
 *    (original topic/partition/offset/key, attempt count, error message,
 *    the parsed envelope) to diagnose without re-reading source code. The
 *    offset still auto-commits after a DLQ park, so one poison message
 *    doesn't block the partition forever — see docs/roadmap/PHASES.md
 *    Phase 8 and scripts/replay-dlq.ts for replaying a parked message.
 *
 * Idempotency (surviving *duplicate* delivery, as opposed to retrying a
 * *failed* one) is a deliberately separate concern owned by each handler —
 * see TripsRepository.runIdempotent (Postgres) and IdempotencyStore (Redis,
 * for consumers with no Postgres of their own, e.g. Dispatch Service).
 */
export class EventConsumer {
  private readonly consumer: Consumer;
  private readonly dlqProducer: Producer;
  private readonly dlqTopicName: string;
  private dlqTopicEnsured = false;

  constructor(
    private readonly kafka: Kafka,
    private readonly groupId: string,
  ) {
    this.consumer = kafka.consumer({ groupId });
    this.dlqProducer = kafka.producer();
    this.dlqTopicName = `${groupId}.dlt`;
  }

  get dlqTopic(): string {
    return this.dlqTopicName;
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
    await this.dlqProducer.connect();
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
    await this.dlqProducer.disconnect();
  }

  /**
   * Explicitly creates each topic (if missing) and waits for its partition
   * leader to be elected before subscribing. Relying on implicit
   * auto-create-on-subscribe is flaky against a just-started broker — the
   * metadata request that triggers creation can return before leader
   * election finishes, surfacing as "This server does not host this
   * topic-partition" on the very next subscribe/fetch.
   *
   * This consumer's own DLT is deliberately *not* created here — see
   * ensureDlqTopic(), created lazily only if a message ever actually needs
   * parking. Eagerly creating it for every consumer regardless of whether
   * it's ever used doesn't pay for itself, and on a single-broker dev
   * cluster it measurably slows down test suites that spin up many
   * short-lived consumers with unique group ids (each a topic the broker
   * has never seen before, i.e. a real leader election, not a no-op).
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

  private async ensureDlqTopic(): Promise<void> {
    if (this.dlqTopicEnsured) {
      return;
    }
    const admin = this.kafka.admin();
    await admin.connect();
    try {
      await admin.createTopics({
        topics: [{ topic: this.dlqTopicName, numPartitions: 1, replicationFactor: 1 }],
        waitForLeaders: true,
      });
    } finally {
      await admin.disconnect();
    }
    this.dlqTopicEnsured = true;
  }

  async run(handler: EventHandler, retry: RetryOptions = {}): Promise<void> {
    const maxAttempts = retry.maxAttempts ?? 3;
    const baseDelayMs = retry.baseDelayMs ?? 200;
    const maxDelayMs = retry.maxDelayMs ?? 5000;

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
          // Malformed JSON can never succeed on retry — park it immediately.
          await this.parkOnDlq(payload, {
            dlqReason: 'malformed-json',
            envelope: null,
            rawValue: raw,
            attempts: 1,
            errorMessage: `Failed to parse event envelope: ${(err as Error).message}`,
          });
          return;
        }

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            await handler(envelope, payload);
            return;
          } catch (err) {
            const isLastAttempt = attempt === maxAttempts;
            if (isLastAttempt) {
              await this.parkOnDlq(payload, {
                dlqReason: 'handler-failed',
                envelope,
                rawValue: null,
                attempts: attempt,
                errorMessage: (err as Error).message,
              });
              return;
            }
            await sleep(backoffDelay(attempt, baseDelayMs, maxDelayMs));
          }
        }
      },
    });
  }

  private async parkOnDlq(
    payload: EachMessagePayload,
    fields: Pick<DlqRecord, 'dlqReason' | 'envelope' | 'rawValue' | 'attempts' | 'errorMessage'>,
  ): Promise<void> {
    await this.ensureDlqTopic();

    const record: DlqRecord = {
      ...fields,
      consumerGroup: this.groupId,
      originalTopic: payload.topic,
      originalPartition: payload.partition,
      originalOffset: payload.message.offset,
      originalKey: payload.message.key?.toString() ?? null,
      failedAt: new Date().toISOString(),
    };

    await this.dlqProducer.send({
      topic: this.dlqTopicName,
      messages: [{ key: payload.message.key, value: JSON.stringify(record) }],
    });

    // eslint-disable-next-line no-console
    console.error(
      `[EventConsumer:${this.groupId}] parked message from ${payload.topic} on ${this.dlqTopicName} after ${fields.attempts} attempt(s): ${fields.errorMessage}`,
    );
  }
}
