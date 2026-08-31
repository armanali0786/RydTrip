/**
 * Phase 8 replay tooling: reads every record currently on a Dead Letter
 * Topic (`<consumer-group>.dlt`, see libraries/event-schema's EventConsumer)
 * and republishes each one's original envelope back onto its original
 * topic, so the owning service's normal consumer picks it up again after
 * whatever made it fail has been fixed.
 *
 * Requires libraries/event-schema to already be built (`npm run build
 * --workspace=libraries/event-schema`) — same requirement as running any
 * service locally against the compiled shared libraries.
 *
 * Usage (from the repo root):
 *   npx ts-node --transpile-only scripts/replay-dlq.ts --topic trip-service.dlt
 *   npx ts-node --transpile-only scripts/replay-dlq.ts --topic dispatch-service.dlt --dry-run
 *
 * Or via the root package.json script:
 *   npm run replay-dlq -- --topic trip-service.dlt
 */
import { createKafkaClient, DlqRecord } from '@rydtrip/event-schema';

interface Args {
  topic: string;
  brokers: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--topic') args.topic = argv[++i];
    else if (arg === '--brokers') args.brokers = argv[++i];
    else if (arg === '--dry-run') args.dryRun = true;
  }
  if (!args.topic) {
    throw new Error('Usage: replay-dlq.ts --topic <consumer-group>.dlt [--brokers host:port] [--dry-run]');
  }
  return {
    topic: args.topic,
    brokers: args.brokers ?? process.env.KAFKA_BROKERS ?? 'localhost:9094',
    dryRun: args.dryRun ?? false,
  };
}

async function main(): Promise<void> {
  const { topic, brokers, dryRun } = parseArgs(process.argv.slice(2));
  const kafka = createKafkaClient({ clientId: 'replay-dlq', brokers: brokers.split(',') });

  const admin = kafka.admin();
  await admin.connect();
  const offsets = await admin.fetchTopicOffsets(topic).catch(() => null);
  await admin.disconnect();
  if (!offsets) {
    console.log(`Topic ${topic} does not exist yet — nothing to replay.`);
    return;
  }
  const highWatermark = offsets.reduce((sum, o) => sum + Number(o.high), 0);
  if (highWatermark === 0) {
    console.log(`Topic ${topic} is empty — nothing to replay.`);
    return;
  }

  const consumer = kafka.consumer({ groupId: `replay-dlq-${Date.now()}` });
  const producer = kafka.producer();
  await consumer.connect();
  await producer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  let seen = 0;
  let replayed = 0;
  let skipped = 0;

  await new Promise<void>((resolve, reject) => {
    consumer
      .run({
        eachMessage: async ({ message }) => {
          seen++;
          const raw = message.value?.toString();
          if (!raw) return;

          let record: DlqRecord;
          try {
            record = JSON.parse(raw) as DlqRecord;
          } catch {
            console.warn(`Skipping unparseable DLQ record at offset ${message.offset}`);
            skipped++;
            return;
          }

          if (!record.envelope) {
            console.warn(
              `Skipping record with no recoverable envelope (reason: ${record.dlqReason}) from ${record.originalTopic}, offset ${message.offset} — malformed JSON can't be reconstructed`,
            );
            skipped++;
          } else if (dryRun) {
            console.log(
              `[dry-run] would replay eventId=${record.envelope.eventId} eventType=${record.envelope.eventType} -> ${record.originalTopic} (failed after ${record.attempts} attempt(s): ${record.errorMessage})`,
            );
            replayed++;
          } else {
            await producer.send({
              topic: record.originalTopic,
              messages: [{ key: record.originalKey, value: JSON.stringify(record.envelope) }],
            });
            console.log(`Replayed eventId=${record.envelope.eventId} eventType=${record.envelope.eventType} -> ${record.originalTopic}`);
            replayed++;
          }

          if (seen >= highWatermark) {
            resolve();
          }
        },
      })
      .catch(reject);
  });

  await consumer.disconnect();
  await producer.disconnect();

  console.log(`\nDone. ${replayed} replayed, ${skipped} skipped, ${seen} total record(s) on ${topic}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
