import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Message } from '@app/schemas/message.schema';
import { Sector } from '@app/schemas/sector.schema';
import { User } from '@app/schemas/user.schema';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { socketAuthMiddleware } from './socket.auth';
import { Redis } from 'ioredis';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({ cors: { origin: "*" } })
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private readonly redisClient: Redis,
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Sector.name) private sectorModel: Model<Sector>,
        @InjectModel(Message.name) private messageModel: Model<Message>
    ) { }

    @WebSocketServer()
    server: Server;

    afterInit(server: Server) {
        socketAuthMiddleware(server);
    }

    async handleConnection(socket: Socket) {
        console.log(`Client connected: ${socket.id}`);
        const user: any = await this.userModel.findOne({ email: socket.data.userEmail }).select("sectors phone_number")
        if (!user) {
            console.warn('User not found for socket:', socket.id);
            socket.disconnect(true);
            return;
        }
        const allSectors = [user.id, ...user.sectors.map(i => i._id.toString())]
        socket.join(allSectors)
        socket.data.user = { _id: user.id, phone_number: user.phone_number, sectors: allSectors }
        await this.redisClient.hset('usersSockets', user?.id, socket.id).catch(console.error)
        console.log(`joined ${allSectors.length} sectors...`)
    }

    async handleDisconnect(socket: Socket) {
        const userId = socket.data.user?._id
        if (!userId) {
            console.log('No userId found for socket', socket.id);
            return;
        }
        await this.redisClient.hdel('usersSockets', userId, socket.id)
        await this.redisClient.hset("userLastSeen", userId, Date.now())
        console.log('disconnected:', socket.id)
    }

    @SubscribeMessage('message')
    handleMessage(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
        const _id = new Types.ObjectId()
        const { id, domainId, createdAt, ...rest } = data
        const storedMessage = {
            data: {
                ...rest,
                _id: _id,
                creator_id: socket.data.user._id,
                creator_number: socket.data.user.phone_number
            },
            domainId: data.domainId,
            time: Date.now()
        }
        const sectors = socket.data.user.sectors
        const senderId = socket.data.user._id
        if (sectors.includes(rest.sector_id) || domainId === "ccccccc") {
            this.redisClient.hset(`${senderId}-${rest.sector_id}-${_id}`, storedMessage)
            socket.emit("ack-message", {
                _id: _id.toString(),
                messageId: id,
                sectorId: rest.sector_id,
                domainId: domainId
            })
            socket.broadcast.to(rest.sector_id).emit('sector-message', storedMessage)
        } else {
            console.log("check..", "sectors")
        }
    }

    @SubscribeMessage("missedSectorMessages")
    async handleMissedMessages(@MessageBody() lastSectorMessageId: string, @ConnectedSocket() socket: Socket) {
        // const message = await this.messageModel.find({
        //     // sector_id: { $in: socket.data.user.sectors },
        //     createdAt: { $gt: lastSectorMessageId }
        // })
        // socket.emit("syncMessages", { data: message })
    }

    @SubscribeMessage("sendMessage")
    async handleSendMessage(@MessageBody() data: any) {
        const { personId, messageId, message } = data
        await this.redisClient.set(`message:${messageId}`, JSON.stringify({ personId, message }));
        this.server.to(personId).emit('receive_message', { messageId, message });
    }

    @SubscribeMessage("ackMessage")
    async handleAckMessage(@MessageBody() messageId: string) {
        await this.redisClient.del(messageId)
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
