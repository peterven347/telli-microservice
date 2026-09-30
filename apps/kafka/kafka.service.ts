import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(KafkaService.name);
    private kafka!: Kafka;
    private producer!: Producer;
    private consumer?: Consumer;

    constructor(private readonly configService: ConfigService) { }

    async onModuleInit() {
        const brokers = this.configService.get<string>('KAFKA_BROKER')?.split(',') ?? []

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
        try {
            await this.producer.connect();
            this.logger.log('Kafka producer connected successfully');
        } catch (err) {
            this.logger.error('Failed to connect Kafka producer', (err as Error).stack);
            throw err;
        }
    }

    async onModuleDestroy() {
        try {
            if (this.producer) await this.producer.disconnect();
            if (this.consumer) await this.consumer.disconnect();
            this.logger.log('Kafka connections closed');
        } catch (err) {
            this.logger.error('Error during Kafka shutdown', (err as Error).stack);
        }
    }

    getProducer(): Producer {
        if (!this.producer) throw new Error('Kafka producer not initialized');
        return this.producer;
    }

    async createConsumer(groupId: string): Promise<Consumer> {
        if (!this.kafka) throw new Error('Kafka client not initialized');
        this.consumer = this.kafka.consumer({ groupId });
        try {
            await this.consumer.connect();
            this.logger.log(`Kafka consumer connected (groupId=${groupId})`);
        } catch (err) {
            this.logger.error(`Failed to connect consumer for groupId=${groupId}`, (err as Error).stack);
            throw err;
        }
        return this.consumer;
    }

    async send(topic: string, messages: Array<{ key?: string; value: string }>) {
        const producer = this.getProducer();
        try {
            return await producer.send({ topic, messages });
        } catch (err) {
            this.logger.error(`Failed to send messages to topic ${topic}`, (err as Error).stack);
            throw err;
        }
    }
}