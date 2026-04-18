import { Injectable } from '@nestjs/common';
import { KafkaService } from './kafka.service';

@Injectable()
export class KafkaProducer {
  constructor(private readonly kafkaService: KafkaService) { }

  async sendMessage(topic: string, key: string, value: any) {
    const producer = this.kafkaService.getProducer();

    await producer.send({
      topic: "chat.messages",
      messages: [
        {
          key,
          value: JSON.stringify(value),
        },
      ],
    });
  }
}