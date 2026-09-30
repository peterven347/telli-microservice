import { Injectable } from '@nestjs/common';
import { KafkaService } from './kafka.service';

@Injectable()
export class KafkaProducer {
<<<<<<< HEAD
    constructor(private readonly kafkaService: KafkaService) { }

    async sendMessage(topic: string, key: string, value: any) {
        await this.kafkaService.send(topic, [
            {
                key,
                value: JSON.stringify(value),
            },
        ]);
    }

    async sendNotification(topic: string, key: string, value: any) {
        await this.kafkaService.send(topic, [
            {
                key,
                value: JSON.stringify(value),
            },
        ]);
    }
=======
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
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
}