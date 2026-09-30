import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(4002, '127.0.0.1');
  console.log('Livestream HTTP server running on 127.0.0.1:4002');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '127.0.0.1',
      port: 3002,
    },
  });

  await app.startAllMicroservices();
  console.log('Livestream TCP microservice running on 127.0.0.1:3002');
}

bootstrap();
