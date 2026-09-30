// libs/socket-publisher/socket-publisher.service.ts
import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class SocketPublisherService {
    constructor(@Inject("REDIS_CLIENT") private readonly redisClient: Redis) { }

    async emitToRoom(event: string, room: string | string[], payload: any) {
        try {
            await this.redisClient.publish('socket.emit', JSON.stringify({ event, room, payload }));
        } catch (err) {
            console.log(err)
        }
    }
}