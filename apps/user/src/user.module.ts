import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserSchema } from "apps/user/src/user.schema";
import { MailModule } from './mail/mail.module';
import { RedisModule } from 'apps/redis/redis.module';
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [
		// ConfigModule.forRoot({
		// 	isGlobal: true,
		// }),
		HttpModule,
		MailModule,
		RedisModule,
		JwtModule.register({ secret: process.env.ACCESS_TOKEN_SECRET, signOptions: { expiresIn: '1m' } }),
		MongooseModule.forFeature([
			{ name: User.name, schema: UserSchema }
		]),
	],
	controllers: [UserController],
	providers: [UserService],
	exports: [UserService],
})

export class UserModule { }