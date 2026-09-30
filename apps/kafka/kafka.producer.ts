import { Injectable } from '@nestjs/common';
import { KafkaService } from './kafka.service';

@Injectable()
export class KafkaProducer {
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
}