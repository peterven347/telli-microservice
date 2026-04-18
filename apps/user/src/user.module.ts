import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserSchema } from "@app/schemas/user.schema";
import { MailModule } from './mail/mail.module';
import { RedisModule } from 'apps/redis/redis.module';
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [
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