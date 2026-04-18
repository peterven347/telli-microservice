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
    }

    async handleConnection(socket: Socket) {
        socket.emit("time", Date.now())
        const user = await this.userService.findOne(socket.data.userEmail);
        if (!user) {
            console.log('User not found for socket:', socket.id);
            socket.disconnect(true);
            return;
        }
        const allSectors = [user.id, ...user.sectors.map(i => i._id.toString())]
        socket.join(allSectors)
        socket.data.user = { _id: user.id, phone_number: user.phone_number, sectors: allSectors }
        await this.redis.hset('usersSockets', user?.id, socket.id).catch(console.error)
        console.log(`${socket.id} joined ${allSectors.length} sectors...`)
    }

    async handleDisconnect(socket: Socket) {
        const userId = socket.data.user?._id
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
            streamKey,
            "MAXLEN",
            "~",
            10000,
            "*",
            "data",
            JSON.stringify(storedMessage)
        );
        socket.emit("ack-message", { _id: _id, id: id })
        socket.broadcast.to(sector_id).emit('direct-message', { streamKey: streamKey, redisId: entryId, ...storedMessage })
    }

    @SubscribeMessage("sector-message")
    async sectorMessage(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
        const sectors = socket.data.user.sectors
        if (sectors.includes(data.sector_id) || socket.data.user._id === data.creator_id) {
            this.kafkaProducer.sendMessage(
                "chat.messages",
                data.sector_id,
                { socketId: socket.id, data: data }
            );
        }
    }

    @SubscribeMessage("missedMessages")
    async Messages(@MessageBody() lastSectorMessageId: string, @ConnectedSocket() socket: Socket) {
        const redis = this.redis
        async function missedDirectMessages() {
            const user_id = socket.data.user._id
            const pattern = `*:${user_id}`;
            let cursor = "0";
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
                }
            } while (cursor !== "0");
            return messagesByConversation;
        }
        socket.emit("missedDirectMessages", { data: await missedDirectMessages() })

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
                        console.log("lastMessageId", lastMessageId)
                        // redis.set(`user:${userId}:last_read:${key}`, lastMessageId);
                    }
                });
            } while (cursor !== "0");
            return messagesByConversation;
        }
        console.log(await missedSectorMessages())
        if (Object.keys(await missedSectorMessages()).length > 0) {
            socket.emit("missedSectorMessages", { data: await missedSectorMessages() })
            return
        }

    }

    @SubscribeMessage("ackMessage")
    async handleAckMessage(@MessageBody() { streamKey, ids }: { streamKey: string, ids: string[] }) {
        await this.redis.xdel(streamKey, ...ids)
        console.log("deleted")
    }

    emitToSocket(socketId: string, event: string, data: any) {
        this.server.to(socketId).emit(event, data);
    }

    emitToUser(userId: string, event: string, data: any) {
        this.server.to(userId).emit(event, data);
    }

    async getSocketsByUserIdandJoinRoom(roomName: string, id: string) {
        const socket = this.server.sockets.sockets.get(id)
        socket?.join(roomName)
    }
}
