import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { GatewayModule } from './gateway.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';


async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(GatewayModule);
	app.useGlobalPipes(new ValidationPipe());
	app.useStaticAssets(join(__dirname, '..', "..", "..", 'uploads'), {
		prefix: '/files/',
	});
	await app.listen(3000);
	console.log('Gateway HTTP server listening on port 3000');
}

bootstrap();
