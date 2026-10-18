import { NestFactory } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {

    const app = await NestFactory.create(AppModule);

    const configService = app.get(ConfigService);
    app.connectMicroservice<MicroserviceOptions>(
        {
            transport: Transport.TCP,
            options: {
                host: configService.get<string>('TCP_HOST'),
                port: configService.get<number>('CHAT_SERVICE_TCP_PORT'),
            },
        },
    );

    await app.startAllMicroservices();
    console.log(`Chat microservice is listening on TCP port ${configService.get<number>('CHAT_SERVICE_TCP_PORT')}`);
}

bootstrap();
