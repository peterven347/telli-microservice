import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
<<<<<<< HEAD
import { Domain, DomainSchema } from 'apps/chat/src/domain.schema';
import { Sector, SectorSchema } from 'apps/chat/src/sector.schema';
import { MongooseModule } from '@nestjs/mongoose';
// import { SocketCoreModule } from 'apps/socket/socket-core.module';
import { SocketPublisherModule } from 'libs/socket-publisher/socket-publisher.module';

import { RedisModule } from 'apps/redis/redis.module';
// import { KafkaModule } from 'apps/kafka/kafka.module';
=======
import { Domain, DomainSchema } from '@app/schemas/chat.schema';
import { Sector, SectorSchema } from '@app/schemas/sector.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { SocketGateway } from 'apps/socket/socket.service';
import { RedisModule } from 'apps/redis/redis.module';
import { KafkaModule } from 'apps/kafka/kafka.module';
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [
		HttpModule,
<<<<<<< HEAD
		// KafkaModule,
		RedisModule,
		SocketPublisherModule,
=======
		KafkaModule,
		RedisModule,
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
		MongooseModule.forFeature([
			{ name: Domain.name, schema: DomainSchema },
			{ name: Sector.name, schema: SectorSchema },
		]),
	],
	controllers: [ChatController],
<<<<<<< HEAD
	providers: [ChatService],
=======
	providers: [SocketGateway, ChatService],
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
})
export class ChatModule { }
