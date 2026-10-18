import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const host = configService.getOrThrow<string>('TCP_HOST');
  const httpPort = configService.getOrThrow<number>('LIVESTREAM_SERVICE_HTTP_PORT');
  const tcpPort = configService.getOrThrow<number>('LIVESTREAM_SERVICE_TCP_PORT')

  await app.listen(httpPort, host);
  console.log(`Livestream HTTP server running on ${httpPort}`);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: host,
      port: tcpPort,
    },
  });

  await app.startAllMicroservices();
  console.log(`Livestream TCP microservice running on ${tcpPort}`);
}

bootstrap();
