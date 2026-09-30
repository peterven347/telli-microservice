import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Domain, DomainSchema } from 'apps/chat/src/domain.schema';
import { Sector, SectorSchema } from 'apps/chat/src/sector.schema';
import { MongooseModule } from '@nestjs/mongoose';
// import { SocketCoreModule } from 'apps/socket/socket-core.module';
import { SocketPublisherModule } from 'libs/socket-publisher/socket-publisher.module';

import { RedisModule } from 'apps/redis/redis.module';
// import { KafkaModule } from 'apps/kafka/kafka.module';
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [
		HttpModule,
		// KafkaModule,
		RedisModule,
		SocketPublisherModule,
		MongooseModule.forFeature([
			{ name: Domain.name, schema: DomainSchema },
			{ name: Sector.name, schema: SectorSchema },
		]),
	],
	controllers: [ChatController],
	providers: [ChatService],
})
export class ChatModule { }
