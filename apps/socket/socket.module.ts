import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { SocketCoreModule } from './socket-core.module';

@Module({
  imports: [SocketCoreModule],
  providers: [SocketGateway],
  exports: [SocketCoreModule],
})
export class SocketModule {}