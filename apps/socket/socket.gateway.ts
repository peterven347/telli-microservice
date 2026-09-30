import { Inject, NotFoundException } from "@nestjs/common";
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { socketAuth } from './socket.auth';
import { SocketService } from './socket.service';
import Redis from "ioredis";
import * as fs from 'fs';
import * as path from "path"


const ACTIVE_LIVESTREAMS = "livestreams:active";
const MAX_COMMENTS_PER_STREAM = 500;

interface Comment {
    _id: string;
    userName: string
    comment: string;
    createdAt: number;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class SocketGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private readonly socketService: SocketService,
        @Inject('REDIS_SUBSCRIBER') private readonly redisSubscriber: Redis,
        @Inject('REDIS_CLIENT') private readonly redisClient: Redis
    ) {
    }

    @WebSocketServer()
    server!: Server;

    afterInit(server: Server) {
        socketAuth(server);

        this.redisSubscriber.subscribe('socket.emit');
        this.redisSubscriber.on('message', (channel, message) => {
            if (channel !== 'socket.emit') return;
            const { event, room, payload } = JSON.parse(message);
            if (room) {
                server.to(room).emit(event, payload);
            }
        });

    }

    private commentsKey(streamId: string): string {
        return `comments:${streamId}`;
    }

    async handleConnection(socket: Socket) {
        return await this.socketService.handleConnection(socket)
    }

    async handleDisconnect(socket: Socket) {
        return this.socketService.handleDisconnect(socket);
    }

    async emitToSocket(socketId: string, event: string, data: any) {
        this.server.to(socketId).emit(event, data);
    }

    // @SubscribeMessage('test')
    // async test() {
    //     console.log("testing websocket")
    //     return
    //     // return this.socketService.test()
    // }

    @SubscribeMessage('direct-message')
    async directMessage(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
        return await this.socketService.directMessage(data, socket, this.server)
    }

    @SubscribeMessage("sector-message")
    async sectorMessage(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
        return this.socketService.sectorMessage(data, socket)
    }

    @SubscribeMessage("missed-messages")
    async Messages(@MessageBody() lastSectorMessageId: string, @ConnectedSocket() socket: Socket) {
        return this.socketService.missedMessages(lastSectorMessageId, socket)
    }

    @SubscribeMessage("ack-message")
    async handleAckMessage(@MessageBody() { streamKey, ids }: { streamKey: string, ids: string[] }) {
        return this.socketService.ackMessage({ streamKey, ids })
    }

    //
    @SubscribeMessage("create-call")
    async createRoom(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
        return this.socketService.createCall(data, socket)
    }

    @SubscribeMessage("join-call")
    async joinRoom(@MessageBody() room: string, @ConnectedSocket() socket: Socket) {
        return this.socketService.joinCall(room, socket, this.server)
    }

    @SubscribeMessage("end-call")
    async endCall(@MessageBody() room: string, @ConnectedSocket() socket: Socket) {
        socket.to(room).emit("end-call")
    }

    @SubscribeMessage("ignore-call")
    async ignoreCall(@MessageBody() room: string, @ConnectedSocket() socket: Socket) {
        socket.to(room).emit("call-ignored")
    }

    @SubscribeMessage("cancel-call")
    async cancelCall(@MessageBody() room: string, @ConnectedSocket() socket: Socket) {
        socket.to(room).emit("call-cancelled")
    }

    @SubscribeMessage("offer")
    async offer(@MessageBody() payload: any, @ConnectedSocket() socket: Socket) {
        socket.to(payload.roomId).emit('offer', {
            sdp: payload.sdp,
            callArgs: payload.callArgs
        });
    }

    @SubscribeMessage("answer")
    async answer(@MessageBody() payload: any, @ConnectedSocket() socket: Socket) {
        console.log("answer", payload.roomId)
        socket.to(payload.roomId).emit('answer', {
            sdp: payload.sdp,
        });
    }

    @SubscribeMessage("ice-candidate")
    async candidate(@MessageBody() incoming: any, @ConnectedSocket() socket: Socket) {
        socket.to(incoming.roomId).emit('ice-candidate', {
            candidate: incoming.candidate,
        });
    }
    //

    @SubscribeMessage("joinLiveStream")
    async joinLiveStream(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
        socket.join(`liveStream:${data.streamId}`)
    }

    @SubscribeMessage("leaveLiveStream")
    async leaveLiveStream(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
        socket.leave(`liveStream:${data.streamId}`)
    }

    @SubscribeMessage("addStreamComment")
    async addStreamComment(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
        const { note, streamId } = data
        if (!note) return
        const isLive = await this.redisClient.sismember(ACTIVE_LIVESTREAMS, streamId);
        if (!isLive) {
            throw new NotFoundException(`No active livestream for ${streamId}`);
        }
        const comment: Comment = {
            _id: socket.data.user._id,
            userName: socket.data.user.user_name,
            comment: note,
            createdAt: Date.now(),
        };

        const key = this.commentsKey(streamId);
        const pipeline = this.redisClient.pipeline();
        pipeline.rpush(key, JSON.stringify(comment));
        pipeline.ltrim(key, -MAX_COMMENTS_PER_STREAM, -1);
        await pipeline.exec();
        this.server.to(`liveStream:${streamId}`).emit("addStreamComment", comment);
    }
}