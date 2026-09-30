import { Module } from '@nestjs/common';
import { LivestreamService } from './livestream.service';
import { LivestreamController } from './livestream.controller';
import { RedisModule } from 'apps/redis/redis.module';
import { HttpModule } from '@nestjs/axios';
import { SocketModule } from 'apps/socket/socket.module';
import { SocketCoreModule } from 'apps/socket/socket-core.module';
import { SocketPublisherModule } from 'libs/socket-publisher/socket-publisher.module';

@Module({
  imports: [HttpModule, RedisModule, SocketPublisherModule],
  controllers: [LivestreamController],
  providers: [LivestreamService],
})
export class LivestreamModule {}
