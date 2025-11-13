import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Domain, DomainSchema } from '@app/schemas/chat.schema';
import { Sector, SectorSchema } from '@app/schemas/sector.schema';
import { Message, MessageSchema } from '@app/schemas/message.schema';
import { User, UserSchema } from "@app/schemas/user.schema";
import { MongooseModule } from '@nestjs/mongoose';
import { SocketGateway } from 'apps/gateway/src/socket/socket.service';
import { Redis } from 'ioredis';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: Domain.name, schema: DomainSchema },
			{ name: Sector.name, schema: SectorSchema },
			{ name: Message.name, schema: MessageSchema },
			{ name: User.name, schema: UserSchema }
		]),
	],
	controllers: [ChatController],
	providers: [SocketGateway, ChatService, { provide: Redis, useValue: new Redis() }],
})
export class ChatModule { }
