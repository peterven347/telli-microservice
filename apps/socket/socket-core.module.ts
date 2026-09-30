import { Module } from '@nestjs/common';
import { SocketService } from './socket.service';
import { KafkaModule } from 'apps/kafka/kafka.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule, KafkaModule],
  providers: [SocketService],
  exports: [SocketService],
})
export class SocketCoreModule {}
