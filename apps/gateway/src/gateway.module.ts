import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthController, CallController, ChatController, PostController, UserController } from './gateway.controller';
import { AuthService } from './gateway.service';
import { ConfigModule } from '@nestjs/config';
import { SocketGateway } from './socket/socket.service';
import { Redis } from 'ioredis';
import { MongooseModule } from '@nestjs/mongoose';
import { Domain, DomainSchema } from '@app/schemas/chat.schema';
import { Sector, SectorSchema } from '@app/schemas/sector.schema';
import { Message, MessageSchema } from '@app/schemas/message.schema';
import { User, UserSchema } from "@app/schemas/user.schema";
import { JwtModule } from '@nestjs/jwt';


@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		JwtModule.register({ secret: process.env.ACCESS_TOKEN_SECRET, signOptions: { expiresIn: '1m' }, }),
		MongooseModule.forRoot('mongodb://localhost:27017/telli'),
		MongooseModule.forFeature([
			{ name: Domain.name, schema: DomainSchema },
			{ name: Sector.name, schema: SectorSchema },
			{ name: Message.name, schema: MessageSchema },
			{ name: User.name, schema: UserSchema }
		]),

		ClientsModule.register([
			{
				name: 'AUTH_SERVICE',
				transport: Transport.TCP,
				options: {
					host: '127.0.0.1',
					port: 3005,
				},
			},
			{
				name: 'CALL_SERVICE',
				transport: Transport.TCP,
				options: {
					host: '127.0.0.1',
					port: 3001,
				},
			},
			{
				name: 'CHAT_SERVICE',
				transport: Transport.TCP,
				options: {
					host: '127.0.0.1',
					port: 3002,
				},
			},
			{
				name: 'POST_SERVICE',
				transport: Transport.TCP,
				options: {
					host: '127.0.0.1',
					port: 3003,
				},
			},
			{
				name: 'USER_SERVICE',
				transport: Transport.TCP,
				options: {
					host: '127.0.0.1',
					port: 3004,
				},
			}
		]),
	],
	controllers: [AuthController, CallController, ChatController, PostController, UserController],
	providers: [{ provide: Redis, useValue: new Redis() }, SocketGateway, PostController]
})

export class GatewayModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AuthService).forRoutes(
			// { path: "user", method: RequestMethod.ALL },
			// { path: "chat", method: RequestMethod.ALL }
		)
	}
}