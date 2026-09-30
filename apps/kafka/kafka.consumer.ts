import { ConfigService } from '@nestjs/config';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { ChatMessagesService } from '../cassandra/src';
import { types } from 'cassandra-driver';
import Redis from 'ioredis';
import * as admin from 'firebase-admin';
import { SocketPublisherService } from 'libs/socket-publisher/socket-publisher.service';

@Injectable()
export class KafkaConsumer implements OnModuleInit {
    constructor(
        @Inject("REDIS_SUBSCRIBER") private readonly subscriber: Redis,
        private readonly configService: ConfigService,
        private readonly kafkaService: KafkaService,
        private readonly chatMessagesService: ChatMessagesService,
        private readonly socketPublisher: SocketPublisherService

    ) {
        admin.initializeApp({
            credential: admin.credential.cert({
                project_id: this.configService.get<string>('PROJECT_ID'),
                client_email: this.configService.get<string>('CLIENT_EMAIL'),
                private_key: this.configService
                    .get<string>('PRIVATE_KEY')
                    ?.replace(/\\n/g, '\n'),
            } as admin.ServiceAccount),
        });
    }

    async onModuleInit() {
        const consumer = await this.kafkaService.createConsumer('chat-group');
        await consumer.subscribe({ topics: ['chat.messages', "chat.notification", "new_domain.notification", "new_sector.notification", "join-call"], fromBeginning: false, });
        await consumer.run({
            eachMessage: async ({ topic, message }) => {
                try {
                    if (!message.value) return;
                    const payload = JSON.parse(message.value.toString());
                    switch (topic) {
                        case 'chat.messages':
                            await this.saveChatMessage(payload);
                            break;
                        case 'chat.notification':
                            await this.sendNotification(
                                payload.fcmToken,
                                {
                                    ACTION: String(payload.data.ACTION),
                                    streamKey: String(payload.data.streamKey),
                                    redisId: String(payload.data.redisId),
                                    buf: String(payload.data.buf),
                                    _id: String(payload.data._id),
                                    creator_number: String(payload.data.creator_number),
                                    time: String(payload.data.time)
                                }
                            );
                            break;
                        case 'new_domain.notification':
                            await this.sendMultipleNotification(
                                payload.fcmTokens,
                                JSON.stringify(payload.data)
                            );
                            break;
                        case "new_sector.notification":
                            await this.sendMultipleNotification(
                                payload.fcmTokens,
                                JSON.stringify(payload.data)
                            );
                            break;
                        case "join-call":
                            await this.sendCallNotification(
                                payload.fcmToken,
                                payload.data
                            );
                            break;
                    }
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            },

        })
    }

    private async sendNotification(token: string, data?: any) {
        const message: admin.messaging.Message = {
            token,
            data,
            // notification: {
            //     title: 'dfgfd',
            //     body: "dfghgf"
            // },
            android: { priority: "high" },
            apns: {
                payload: { aps: { contentAvailable: true } },
                headers: { "apns-priority": "5" },
            },
        };
        try {
            const response = await admin.messaging().send(message);
            console.log("FCM send success:", response);
            return response;
        } catch (error) {
            console.error("FCM send failed:", error);
            throw error;
        }
    }

    private async sendMultipleNotification(tokens: string[], data?: any) {
        const parsedData = JSON.parse(data)
        const message: admin.messaging.MulticastMessage = {
            tokens,
            notification: {
                title: "Telli",
                body: `You have been added to ${parsedData.sector.title} of (${parsedData.domain.name || "Telli"})`,
            },
            data,
        };
        return admin.messaging().sendEachForMulticast(message);
    }

    private async saveChatMessage(message: any) {
        const { id, domain_id, sector_id } = message.data
        const _id = types.TimeUuid.now().toString()
        await this.chatMessagesService.saveMessage({ _id: _id, ...message.data });
        this.socketPublisher.emitToRoom('ack-message', message.socketId, { _id: _id, id: id })
        this.socketPublisher.emitToRoom(sector_id, "sector-message", { _id: _id, ...message })
        // this.sendNotification(
        //     "feqr5hLEQFWPpMZvfwDKUe:APA91bEMIbCYgGeCVgJRVgMZzXt7IhQs-lXJ38Grqib7Oz1BGXTzFQfYBDimL4W1ksCjS1zggOvr6OgJ53K4pECc4VAkuScoMjkK0a-RDRyagbZKnQllBbI",
        //     { _id: _id, redisId: entryId, ...message }
        // );
    }

    private async sendCallNotification(token: string, data?: any) {
        const message: admin.messaging.Message = {
            token,
            data,
            // notification: {
            //     title: 'Incoming Call',
            //     // body: ""
            // },
            android: { priority: "high" },
            apns: {
                payload: { aps: { contentAvailable: true } },
                headers: { "apns-priority": "5" },
            },
        };
        try {
            const response = await admin.messaging().send(message);
            console.log("FCM call success:", response);
            return response;
        } catch (error) {
            console.error("FCM call failed:", error);
        }
    }

}
// If these users should always receive the same notifications, subscribe them to a topic:
// await admin.messaging().subscribeToTopic(tokens, "news");
// await admin.messaging().send({
//   topic: "news",
//   notification: {
//     title: "Hello",
//     body: "World",
//   },
// });
