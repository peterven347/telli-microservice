import { NestFactory } from '@nestjs/core';
<<<<<<< HEAD
import { ConfigService } from '@nestjs/config';
import {
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const host = configService.getOrThrow<string>('USER_SERVICE_HOST');
  const httpPort = configService.getOrThrow<number>('USER_SERVICE_HTTP_PORT');
  const tcpPort = configService.getOrThrow<number>('USER_SERVICE_TCP_PORT')

  await app.listen(httpPort, host);
  console.log(`User HTTP server running on ${host}:${httpPort}`);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: host,
      port: tcpPort,
    },
  });

  await app.startAllMicroservices();
  console.log(`User TCP microservice running on ${host}:${tcpPort}`);
}

bootstrap();
=======
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
	const app = await NestFactory.createMicroservice<MicroserviceOptions>(
		AppModule,
		{
			transport: Transport.TCP,
			options: {
				host: '127.0.0.1',
				port: 3004,
			},
		},
	);
	await app.listen();
	console.log('User microservice is listening on TCP port 3004');
}

bootstrap();
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
