// libs/socket-publisher/socket-publisher.module.ts
import { Module } from '@nestjs/common';
import { SocketPublisherService } from './socket-publisher.service';
import { RedisModule } from 'apps/redis/redis.module';
@Module({
  imports: [RedisModule],
  providers: [SocketPublisherService],
  exports: [SocketPublisherService],
})
export class SocketPublisherModule {}