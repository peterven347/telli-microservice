import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
<<<<<<< HEAD
import { ChatController, LivestreamController, PostController, UserController, FilesController } from './gateway.controller';
import { AuthService } from './gateway.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SocketModule } from '../../socket/socket.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Domain, DomainSchema } from 'apps/chat/src/domain.schema';
import { Sector, SectorSchema } from 'apps/chat/src/sector.schema';
import { User, UserSchema } from "apps/user/src/user.schema";
=======
import { ChatController, PostController, UserController } from './gateway.controller';
import { AuthService } from './gateway.service';
import { ConfigModule } from '@nestjs/config';
import { SocketGateway } from '../../socket/socket.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Domain, DomainSchema } from '@app/schemas/chat.schema';
import { Sector, SectorSchema } from '@app/schemas/sector.schema';
import { User, UserSchema } from "@app/schemas/user.schema";
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
import { JwtModule } from '@nestjs/jwt';
import { KafkaModule } from 'apps/kafka/kafka.module';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
<<<<<<< HEAD
import { FilesModule } from "../../fileUpload/files.module"
=======
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		AuthModule,
		KafkaModule,
<<<<<<< HEAD
		SocketModule,
		FilesModule,
		JwtModule.register({ secret: process.env.ACCESS_TOKEN_SECRET, signOptions: { expiresIn: '1m' }, }),
		MongooseModule.forRoot(process.env.MONGODB_URI as string),
=======
		JwtModule.register({ secret: process.env.ACCESS_TOKEN_SECRET, signOptions: { expiresIn: '1m' }, }),
		MongooseModule.forRoot('mongodb://localhost:27017/telli'),
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
		MongooseModule.forFeature([
			{ name: Domain.name, schema: DomainSchema },
			{ name: Sector.name, schema: SectorSchema },
			{ name: User.name, schema: UserSchema }
		]),

<<<<<<< HEAD
		ClientsModule.registerAsync([
			{
				name: 'CHAT_SERVICE',
				inject: [ConfigService],
				useFactory: (configService: ConfigService) => ({
					transport: Transport.TCP,
					options: {
						host: configService.getOrThrow<string>('CHAT_SERVICE_HOST'),
						port: configService.getOrThrow<number>('CHAT_SERVICE_TCP_PORT'),
					},
				}),
			},
			{
				name: 'LIVESTREAM_SERVICE',
				inject: [ConfigService],
				useFactory: (configService: ConfigService) => ({
					transport: Transport.TCP,
					options: {
						host: configService.getOrThrow<string>('LIVESTREAM_SERVICE_HOST'),
						port: configService.getOrThrow<number>('LIVESTREAM_SERVICE_TCP_PORT'),
					},
				}),
			},
			{
				name: 'POST_SERVICE',
				inject: [ConfigService],
				useFactory: (configService: ConfigService) => ({
					transport: Transport.TCP,
					options: {
						host: configService.getOrThrow<string>('POST_SERVICE_HOST'),
						port: configService.getOrThrow<number>('POST_SERVICE_TCP_PORT'),
					},
				}),
			},
			{
				name: 'USER_SERVICE',
				inject: [ConfigService],
				useFactory: (configService: ConfigService) => ({
					transport: Transport.TCP,
					options: {
						host: configService.getOrThrow<string>('USER_SERVICE_HOST'),
						port: configService.getOrThrow<number>('USER_SERVICE_TCP_PORT'),
					},
				}),
			},
		]),
	],
	controllers: [ChatController, LivestreamController, PostController, UserController, FilesController],
=======
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
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
	providers: [
		{
			provide: APP_GUARD,
			// useFactory: (reflector: Reflector) => {
			// 	return new JwtAuthGuard(reflector);
			// },
			// inject: [Reflector],
			useClass: JwtAuthGuard,
		},
<<<<<<< HEAD
=======
		SocketGateway
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
	],
})

export class GatewayModule { }