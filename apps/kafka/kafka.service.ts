import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, Consumer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
    private kafka: Kafka;
    private producer: Producer;
    private consumer: Consumer;

    async onModuleInit() {
        const brokers = (process.env.KAFKA_BROKERS || '127.0.0.1:9092').split(',');
        this.kafka = new Kafka({
            clientId: 'chat-app',
            brokers,
            connectionTimeout: 10000,
            requestTimeout: 30000,
            retry: {
                initialRetryTime: 100,
                retries: 8,
                maxRetryTime: 30000,
                multiplier: 2,
            },
        });

        this.producer = this.kafka.producer();
        await this.producer.connect();
    }

    async onModuleDestroy() {
        await this.producer.disconnect();
        if (this.consumer) {
            await this.consumer.disconnect();
        }
    }

    getProducer(): Producer {
        return this.producer;
    }

    createConsumer(groupId: string): Consumer {
        this.consumer = this.kafka.consumer({ groupId });
        return this.consumer;
    }
}