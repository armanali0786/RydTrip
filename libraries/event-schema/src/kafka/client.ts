import { Kafka, logLevel } from 'kafkajs';

export interface KafkaClientConfig {
  clientId: string;
  brokers: string[];
}

export function createKafkaClient(config: KafkaClientConfig): Kafka {
  return new Kafka({
    clientId: config.clientId,
    brokers: config.brokers,
    logLevel: logLevel.WARN,
  });
}
