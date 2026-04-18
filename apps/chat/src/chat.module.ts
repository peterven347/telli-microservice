import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Domain, DomainSchema } from '@app/schemas/chat.schema';
import { Sector, SectorSchema } from '@app/schemas/sector.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { SocketGateway } from 'apps/socket/socket.service';
import { RedisModule } from 'apps/redis/redis.module';
import { KafkaModule } from 'apps/kafka/kafka.module';
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [
		HttpModule,
		KafkaModule,
		RedisModule,
		MongooseModule.forFeature([
			{ name: Domain.name, schema: DomainSchema },
			{ name: Sector.name, schema: SectorSchema },
		]),
	],
	controllers: [ChatController],
	providers: [SocketGateway, ChatService],
})
export class ChatModule { }
