import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: '/notifications', port: 3002 })
export class NotificationGateway {
    @WebSocketServer()
    server: Server;

    @SubscribeMessage('notify')
    handleNotify(@MessageBody() data: string) {
        console.log('[Notification] Broadcast:', data);
        this.server.emit('notify', data);
    }
}
