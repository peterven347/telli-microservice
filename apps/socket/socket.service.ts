<<<<<<< HEAD
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
=======
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { socketAuthMiddleware } from './socket.auth';
import { Redis } from 'ioredis';
import { Inject, Injectable } from '@nestjs/common';
import { KafkaProducer } from 'apps/kafka/kafka.producer';
import { types } from 'cassandra-driver';
import { UserService } from 'apps/user/src/user.service';
import { REDIS_CLIENT } from 'apps/redis/redis.constants';

@Injectable()
@WebSocketGateway({ cors: { origin: "*" } })
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        @Inject(REDIS_CLIENT) private readonly redis: Redis,
        private readonly kafkaProducer: KafkaProducer,
        private readonly userService: UserService,
    ) { }

    @WebSocketServer()
    server!: Server;

    afterInit(server: Server) {
        socketAuthMiddleware(server);
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
    }

    async handleConnection(socket: Socket) {
        socket.emit("time", Date.now())
<<<<<<< HEAD
        const response = await firstValueFrom(
            this.httpService.get(
                `http://${this.userServiceHost}:${this.userServiceHttpPort}/find-one/email/${socket.data.userEmail}`
            )
        )

        const user = response.data
=======
        const user = await this.userService.findOne(socket.data.userEmail);
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
        if (!user) {
            console.log('User not found for socket:', socket.id);
            socket.disconnect(true);
            return;
        }
<<<<<<< HEAD
        const allSectors = [user._id, `liveStream:${user._id}`, ...user.sectors]
        socket.join(allSectors)
        await this.redis.hset('connected_users', user._id.toString(), JSON.stringify({ socketId: socket.id, fcmToken: (user.fcmTokens).at(-1), phone_number: user.phone_number, sectors: allSectors }))
        socket.data.user = { _id: user._id }
        console.log(`${user.user_name} joined ${allSectors.length} sectors...`)
=======
        const allSectors = [user.id, ...user.sectors.map(i => i._id.toString())]
        socket.join(allSectors)
        socket.data.user = { _id: user.id, phone_number: user.phone_number, sectors: allSectors }
        await this.redis.hset('usersSockets', user?.id, socket.id).catch(console.error)
        console.log(`${socket.id} joined ${allSectors.length} sectors...`)
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
    }

    async handleDisconnect(socket: Socket) {
        const userId = socket.data.user?._id
<<<<<<< HEAD
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
=======
        if (!userId) {
            console.log('No userId found for socket', socket.id);
            return;
        }
        await this.redis.hdel('usersSockets', userId, socket.id)
        await this.redis.hset("userLastSeen", userId, Date.now())
        console.log('disconnected:', socket.id)
    }

    @SubscribeMessage('direct-message')
    async directMessage(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
        const _id = types.TimeUuid.now().toString()
        const { buf, sector_id, id } = data
        const senderId = socket.data.user._id
        const storedMessage = {
            buf: buf,
            _id: _id,
            creator_id: senderId,
            creator_number: socket.data.user.phone_number,
            time: Date.now()
        }
        const redis = this.redis;
        const streamKey = `${senderId}:${sector_id}`
        const entryId = await redis.xadd(
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
            streamKey,
            "MAXLEN",
            "~",
            10000,
            "*",
            "data",
            JSON.stringify(storedMessage)
        );
        socket.emit("ack-message", { _id: _id, id: id })
<<<<<<< HEAD
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
=======
        socket.broadcast.to(sector_id).emit('direct-message', { streamKey: streamKey, redisId: entryId, ...storedMessage })
    }

    @SubscribeMessage("sector-message")
    async sectorMessage(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
        const sectors = socket.data.user.sectors
        if (sectors.includes(data.sector_id) || socket.data.user._id === data.creator_id) {
            this.kafkaProducer.sendMessage(
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
                "chat.messages",
                data.sector_id,
                { socketId: socket.id, data: data }
            );
        }
<<<<<<< HEAD
        else {
            // find out how user patched..
        }
    }

    async missedMessages(lastSectorMessageId: string, socket: Socket) {
=======
    }

    @SubscribeMessage("missedMessages")
    async Messages(@MessageBody() lastSectorMessageId: string, @ConnectedSocket() socket: Socket) {
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
        const redis = this.redis
        async function missedDirectMessages() {
            const user_id = socket.data.user._id
            const pattern = `*:${user_id}`;
            let cursor = "0";
<<<<<<< HEAD
            const mm: any[] = []
=======
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
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
<<<<<<< HEAD
                    // mm.push(msgs)
                }
            } while (cursor !== "0");
            // return mm;
            return messagesByConversation;
        }
        socket.emit("missed-direct-messages", { messages: (await missedDirectMessages()) })
        // socket.emit("missed-direct-messages", { messages: (await missedDirectMessages()).flat() })
        console.log("reading sector messages")
=======
                }
            } while (cursor !== "0");
            return messagesByConversation;
        }
        socket.emit("missedDirectMessages", { data: await missedDirectMessages() })

>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
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
<<<<<<< HEAD
=======
                        console.log("lastMessageId", lastMessageId)
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
                        // redis.set(`user:${userId}:last_read:${key}`, lastMessageId);
                    }
                });
            } while (cursor !== "0");
            return messagesByConversation;
        }
<<<<<<< HEAD
        console.log((await missedSectorMessages()))
        if (Object.keys(await missedSectorMessages()).length > 0) {
            socket.emit("missed-sector-messages", { messages: (await missedSectorMessages()) })
=======
        console.log(await missedSectorMessages())
        if (Object.keys(await missedSectorMessages()).length > 0) {
            socket.emit("missedSectorMessages", { data: await missedSectorMessages() })
            return
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
        }

    }

<<<<<<< HEAD
    async ackMessage({ streamKey, ids }: { streamKey: string, ids: string[] }) {
=======
    @SubscribeMessage("ackMessage")
    async handleAckMessage(@MessageBody() { streamKey, ids }: { streamKey: string, ids: string[] }) {
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
        await this.redis.xdel(streamKey, ...ids)
        console.log("deleted")
    }

<<<<<<< HEAD
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
=======
    emitToSocket(socketId: string, event: string, data: any) {
        this.server.to(socketId).emit(event, data);
    }

    emitToUser(userId: string, event: string, data: any) {
        this.server.to(userId).emit(event, data);
    }

    async getSocketsByUserIdandJoinRoom(roomName: string, id: string) {
        const socket = this.server.sockets.sockets.get(id)
        socket?.join(roomName)
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
    }
}
