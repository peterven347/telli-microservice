import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { ChatMessagesService } from '../cassandra/src';
import { types } from 'cassandra-driver';
import { REDIS_CLIENT } from 'apps/redis/redis.constants';
import Redis from 'ioredis';

@Injectable()
export class KafkaConsumer implements OnModuleInit {
    constructor(
        @Inject(REDIS_CLIENT) private readonly redis: Redis,
        private readonly kafkaService: KafkaService,
        private readonly chatMessagesService: ChatMessagesService,
    ) { }

    async onModuleInit() {
        const consumer = this.kafkaService.createConsumer('chat-group');
        await consumer.connect();
        await consumer.subscribe({ topic: 'chat.messages', fromBeginning: false, });
        await consumer.run({
            eachMessage: async ({ message }) => {
                try {
                    if (!message.value) return;
                    const payload = JSON.parse(message.value.toString());
                    await this.saveChatMessage(payload);
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            },
        })
    }

    private async saveChatMessage(message: any) {
        const { id, domain_id, sector_id } = message.data
        const _id = types.TimeUuid.now().toString()
        const streamKey = `${domain_id}:${sector_id}`
        await this.chatMessagesService.saveMessage({_id: _id, ...message.data});
        const entryId = await this.redis.xadd(
            streamKey,
            "MAXLEN",
            "~",
            10000,
            "*",
            "data",
            JSON.stringify({ _id: _id, ...message.data })
        );
        // this.socket.emitToSocket(message.socketId, "ack-message", { _id: _id, id: id, redisId: entryId } )
        // this.socket.emitToSocket(sector_id, "sector-message", { _id: _id, redisId: entryId, ...message } )
        console.log(`Saved message to Cassandra`);
    }
}



// sudo docker exec -it kafka /opt/kafka/bin/kafka-topics.sh --create \
//   --topic chat.messages \
//   --bootstrap-server 127.0.0.1:9092 \
//   --partitions 3 \
//   --replication-factor 1

// sudo docker exec -it kafka /opt/kafka/bin/kafka-topics.sh --list \
//   --bootstrap-server 127.0.0.1:9092
