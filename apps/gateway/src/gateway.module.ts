import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ChatController, LivestreamController, PostController, UserController, FilesController } from './gateway.controller';
import { AuthService } from './gateway.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SocketModule } from '../../socket/socket.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Domain, DomainSchema } from 'apps/chat/src/domain.schema';
import { Sector, SectorSchema } from 'apps/chat/src/sector.schema';
import { User, UserSchema } from "apps/user/src/user.schema";
import { JwtModule } from '@nestjs/jwt';
import { KafkaModule } from 'apps/kafka/kafka.module';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from "../../fileUpload/files.module"

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		AuthModule,
		KafkaModule,
		SocketModule,
		FilesModule,
		JwtModule.register({ secret: process.env.ACCESS_TOKEN_SECRET, signOptions: { expiresIn: '1m' }, }),
		MongooseModule.forRoot(process.env.MONGODB_URI as string),
		MongooseModule.forFeature([
			{ name: Domain.name, schema: DomainSchema },
			{ name: Sector.name, schema: SectorSchema },
			{ name: User.name, schema: UserSchema }
		]),

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
	providers: [
		{
			provide: APP_GUARD,
			// useFactory: (reflector: Reflector) => {
			// 	return new JwtAuthGuard(reflector);
			// },
			// inject: [Reflector],
			useClass: JwtAuthGuard,
		},
	],
})

export class GatewayModule { }