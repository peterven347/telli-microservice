import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
<<<<<<< HEAD
import { NestExpressApplication } from '@nestjs/platform-express';
// import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { GatewayModule } from './gateway.module';
=======
import { GatewayModule } from './gateway.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348


async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(GatewayModule);
	app.useGlobalPipes(new ValidationPipe());
	app.useStaticAssets(join(__dirname, '..', "..", "..", 'uploads'), {
		prefix: '/files/',
	});
<<<<<<< HEAD

	if (process.env.NODE_ENV !== 'production') {
		const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
		const config = new DocumentBuilder()
			.setTitle('Telli')
			.setDescription('Telli microservices gateway API')
			.setVersion('1.0')
			.addTag('telli')
			.build();
		const documentFactory = () => SwaggerModule.createDocument(app, config);
		SwaggerModule.setup('api', app, documentFactory);
	}

	await app.listen(3000, "0.0.0.0");
=======
	await app.listen(3000);
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
	console.log('Gateway HTTP server listening on port 3000');
}

bootstrap();
