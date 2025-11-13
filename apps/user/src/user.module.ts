import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { Domain, DomainSchema } from '@app/schemas/chat.schema';
import { Sector, SectorSchema } from '@app/schemas/sector.schema';
import { Message, MessageSchema } from '@app/schemas/message.schema';
import { User, UserSchema } from "@app/schemas/user.schema";
import { MailModule } from './mail/mail.module';
import { Redis } from 'ioredis';

@Module({
	imports: [
		MailModule,
		JwtModule.register({ secret: process.env.ACCESS_TOKEN_SECRET, signOptions: { expiresIn: '1m' } }),
		MongooseModule.forFeature([
			{ name: Domain.name, schema: DomainSchema },
			{ name: Sector.name, schema: SectorSchema },
			{ name: Message.name, schema: MessageSchema },
			{ name: User.name, schema: UserSchema }
		]),
	],
	controllers: [UserController],
	providers: [UserService, { provide: Redis, useValue: new Redis() }],
})

export class UserModule { }