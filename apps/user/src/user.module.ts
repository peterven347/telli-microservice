import { Module } from '@nestjs/common';
<<<<<<< HEAD
import { ConfigModule, ConfigService } from '@nestjs/config';
=======
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
<<<<<<< HEAD
import { User, UserSchema } from "apps/user/src/user.schema";
=======
import { User, UserSchema } from "@app/schemas/user.schema";
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
import { MailModule } from './mail/mail.module';
import { RedisModule } from 'apps/redis/redis.module';
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [
<<<<<<< HEAD
		// ConfigModule.forRoot({
		// 	isGlobal: true,
		// }),
=======
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
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