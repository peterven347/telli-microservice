import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ChatController, PostController, UserController } from './gateway.controller';
import { AuthService } from './gateway.service';
import { ConfigModule } from '@nestjs/config';
import { SocketGateway } from '../../socket/socket.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Domain, DomainSchema } from '@app/schemas/chat.schema';
import { Sector, SectorSchema } from '@app/schemas/sector.schema';
import { User, UserSchema } from "@app/schemas/user.schema";
import { JwtModule } from '@nestjs/jwt';
import { KafkaModule } from 'apps/kafka/kafka.module';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		AuthModule,
		KafkaModule,
		JwtModule.register({ secret: process.env.ACCESS_TOKEN_SECRET, signOptions: { expiresIn: '1m' }, }),
		MongooseModule.forRoot('mongodb://localhost:27017/telli'),
		MongooseModule.forFeature([
			{ name: Domain.name, schema: DomainSchema },
			{ name: Sector.name, schema: SectorSchema },
			{ name: User.name, schema: UserSchema }
		]),

		ClientsModule.register([
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
	controllers: [ChatController, PostController, UserController],
	providers: [
		{
			provide: APP_GUARD,
			// useFactory: (reflector: Reflector) => {
			// 	return new JwtAuthGuard(reflector);
			// },
			// inject: [Reflector],
			useClass: JwtAuthGuard,
		},
		SocketGateway
	],
})

export class GatewayModule { }