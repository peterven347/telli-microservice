import { Server, Socket } from 'socket.io';
import { Redis } from 'ioredis';
import { HttpService } from "@nestjs/axios";
import { Inject, Injectable } from '@nestjs/common';
import { KafkaProducer } from 'apps/kafka/kafka.producer';
import { types } from 'cassandra-driver';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SocketService {
    private readonly instanceId = Math.random();

    private server?: Server;
    private serverReady: Promise<void>;
    private resolveServerReady!: () => void;

    private readonly userServiceHost: string;
    private readonly userServiceHttpPort: string;

    constructor(
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
        private readonly kafkaProducer: KafkaProducer,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.serverReady = new Promise((resolve) => {
            this.resolveServerReady = resolve;
        });
        this.userServiceHost = this.configService.getOrThrow<string>('USER_SERVICE_HOST');
        this.userServiceHttpPort = this.configService.getOrThrow<string>('USER_SERVICE_HTTP_PORT');
    }
    setServer(server: Server) {
        console.log('setServer called on:', this.instanceId);
        this.server = server;
        this.resolveServerReady();
    }

    async publishSocketEvent(event: string, payload: any, room?: string) {
        await this.redis.publish('socket.emit', JSON.stringify({ event, payload, room }));
    }

    async handleConnection(socket: Socket) {
        socket.emit("time", Date.now())
        const response = await firstValueFrom(
            this.httpService.get(
                `http://${this.userServiceHost}:${this.userServiceHttpPort}/find-one/email/${socket.data.userEmail}`
            )
        )

        const user = response.data
        if (!user) {
            console.log('User not found for socket:', socket.id);
            socket.disconnect(true);
            return;
        }
        const allSectors = [user._id, `liveStream:${user._id}`, ...user.sectors]
        socket.join(allSectors)
        await this.redis.hset('connected_users', user._id.toString(), JSON.stringify({ socketId: socket.id, fcmToken: (user.fcmTokens).at(-1), phone_number: user.phone_number, sectors: allSectors }))
        socket.data.user = { _id: user._id }
        console.log(`${user.user_name} joined ${allSectors.length} sectors...`)
    }

    async handleDisconnect(socket: Socket) {
        const userId = socket.data.user?._id
        await this.redis.hset("userLastSeen", userId, Date.now())
        // await this.redis.hdel('connected_users', userId);
        console.log('disconnected:', socket.id)
    }

    // async test() {
    //     this.kafkaProducer.sendNotification(
    //         "chat.notification",
    //         "data.sector_id",
    //         {
    //             fcmToken: "feqr5hLEQFWPpMZvfwDKUe:APA91bEMIbCYgGeCVgJRVgMZzXt7IhQs-lXJ38Grqib7Oz1BGXTzFQfYBDimL4W1ksCjS1zggOvr6OgJ53K4pECc4VAkuScoMjkK0a-RDRyagbZKnQllBbI",
    //             data: { sector: JSON.stringify({ newSector: 888 }) }
    //         },
    //     );
    // }

    async directMessage(data, socket: Socket, server: Server) {
        const _id = types.TimeUuid.now().toString()
        const { buf, sectorId, id } = data
        const senderId = socket.data.user._id
        const senderStr = await this.redis.hget('connected_users', senderId);
        const senderData = senderStr ? JSON.parse(senderStr) : null
        const storedMessage = {
            ACTION: "direct-message",
            buf,
            _id,
            creator_id: senderId,
            creator_number: senderData.phone_number,
            time: Date.now()
        }
        const streamKey = `${senderId}:${sectorId}`
        const entryId = await this.redis.xadd(
            streamKey,
            "MAXLEN",
            "~",
            10000,
            "*",
            "data",
            JSON.stringify(storedMessage)
        );
        socket.emit("ack-message", { _id: _id, id: id })
        const personalRoom = await server.in(sectorId).fetchSockets() ?? [];
        const isOnline = personalRoom.length > 0;
        if (isOnline) {
            server.to(sectorId).emit('direct-message', { streamKey: streamKey, redisId: entryId, ...storedMessage });
        } else {
            const receiver = await this.redis.hget('connected_users', sectorId);
            const connectedReceiver = receiver && JSON.parse(receiver);
            if (!connectedReceiver) {
                console.log("receiver not connected")
                return
            }
            const fcmToken = connectedReceiver.fcmToken;
            this.kafkaProducer.sendNotification(
                "chat.notification",
                sectorId,
                { fcmToken: fcmToken, data: { streamKey: streamKey, redisId: entryId, ...storedMessage } }
            );
        }
    }

    async sectorMessage(data: any, socket: Socket) {
        const senderId = socket.data.user._id
        const userData = await this.redis.hget('connected_users', senderId);
        const connectedUser = userData && JSON.parse(userData);
        const sectors = connectedUser?.sectors;
        // console.log(sectors)
        // console.log(data.sector_id)
        if (sectors.includes(data.sector_id) || senderId === data.creator_id) {
            await this.kafkaProducer.sendMessage(
                "chat.messages",
                data.sector_id,
                { socketId: socket.id, data: data }
            );
        }
        else {
            // find out how user patched..
        }
    }

    async missedMessages(lastSectorMessageId: string, socket: Socket) {
        const redis = this.redis
        async function missedDirectMessages() {
            const user_id = socket.data.user._id
            const pattern = `*:${user_id}`;
            let cursor = "0";
            const mm: any[] = []
            const messagesByConversation: Record<string, any[]> = {};
            do {
                const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
                cursor = nextCursor;
                const results: [string, any[]][] = await Promise.all(
                    keys.map(async (key): Promise<[string, any[]]> => {
                        const messages = await redis.xrange(key, "-", "+");
                        const parsed = messages
                            .map(([id, fields]) => {
                                const dataIndex = fields.indexOf("data");
                                if (dataIndex === -1) return null;
                                try {
                                    return {
                                        _redisId: id,
                                        ...JSON.parse(fields[dataIndex + 1])
                                    };
                                } catch {
                                    return null;
                                }
                            })
                            .filter(Boolean);
                        return [key, parsed];
                    })
                );
                for (const [key, msgs] of results) {
                    messagesByConversation[key] = msgs;
                    // mm.push(msgs)
                }
            } while (cursor !== "0");
            // return mm;
            return messagesByConversation;
        }
        socket.emit("missed-direct-messages", { messages: (await missedDirectMessages()) })
        // socket.emit("missed-direct-messages", { messages: (await missedDirectMessages()).flat() })
        console.log("reading sector messages")
        async function missedSectorMessages() {
            const messagesByConversation: Record<string, any[]> = {};
            const sectors = socket.data.user.sectors
            let cursor = "0";
            do {
                const [nextCursor, keys] = await redis.scan(cursor, "MATCH", "*:*", "COUNT", 100);
                cursor = nextCursor;

                if (keys.length === 0) continue;
                const pipeline = redis.pipeline();
                keys.forEach(async (key) => {
                    pipeline.xread("STREAMS", key, lastSectorMessageId);
                });

                const responses = await pipeline.exec() as Array<[Error | null, any]>;
                responses?.forEach(([err, messages], index) => {
                    if (err) return;
                    const key = keys[index];
                    const parsed = messages
                        .map(([id, fields]) => {
                            const dataIndex = fields.indexOf("data");
                            if (dataIndex === -1) return null;
                            try {
                                const data = JSON.parse(fields[dataIndex + 1]);
                                if (!sectors.has(data._id)) return null;
                                return { _redisId: id, ...data };
                            } catch {
                                return null;
                            }
                        })
                        .filter(Boolean);
                    if (!messagesByConversation[key]) messagesByConversation[key] = [];
                    messagesByConversation[key].push(...parsed);
                    if (messages.length > 0) {
                        const lastMessageId = messages[messages.length - 1][0];
                        // redis.set(`user:${userId}:last_read:${key}`, lastMessageId);
                    }
                });
            } while (cursor !== "0");
            return messagesByConversation;
        }
        console.log((await missedSectorMessages()))
        if (Object.keys(await missedSectorMessages()).length > 0) {
            socket.emit("missed-sector-messages", { messages: (await missedSectorMessages()) })
        }

    }

    async ackMessage({ streamKey, ids }: { streamKey: string, ids: string[] }) {
        await this.redis.xdel(streamKey, ...ids)
        console.log("deleted")
    }

    // emitToUser(userId: string, event: string, data: any) {
    //     // this.server.to(userId).emit(event, data);
    // }

    // async getSocketsByUserIdandJoinRoom(roomName: string, id: string) {
    //     // const socket = this.server.sockets.sockets.get(id)
    //     // socket?.join(roomName)
    // }

    async createCall(data, socket) {
        const creatorId = socket.data.user._id
        const roomId = types.TimeUuid.now().toString()
        const receiver = await this.redis.hget('connected_users', data.sectorId);
        const connectedReceiver = receiver && JSON.parse(receiver);
        if (!connectedReceiver) {
            console.log("receiver not connected")
            return
        }
        const fcmToken = connectedReceiver.fcmToken;
        this.kafkaProducer.sendNotification(
            "join-call",
            data.sectorId,
            { fcmToken: fcmToken, data: { ACTION: "join-call", arg: JSON.stringify(data.arg), creatorId, roomId } }
        );
        socket.join(roomId)
        socket.emit("call-room", roomId)
    }

    async joinCall(room, socket, server) {
        const callRoom = await server.in(room).fetchSockets() ?? [];
        const callerIsOnline = callRoom.length > 0;
        if (!callerIsOnline) {
            socket.emit("end-call")
        } else {
            socket.join(room);
            socket.to(callRoom[0].id).emit('peer-joined');
        }
    }
}
