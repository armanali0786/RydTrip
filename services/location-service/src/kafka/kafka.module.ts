import { Global, Module } from '@nestjs/common';
import { KafkaPublisherService } from './kafka-publisher.service';

@Global()
@Module({
  providers: [KafkaPublisherService],
  exports: [KafkaPublisherService],
})
export class KafkaModule {}
