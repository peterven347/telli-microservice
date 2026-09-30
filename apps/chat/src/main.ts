import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
        AppModule,
        {
            transport: Transport.TCP,
            options: {
                host: '127.0.0.1',
<<<<<<< HEAD
                port: 3001,
=======
                port: 3002,
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
            },
        },
    );
    
    await app.listen();
<<<<<<< HEAD
    console.log('Chat microservice is listening on TCP port 3001');
=======
    console.log('Chat microservice is listening on TCP port 3002');
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
}

bootstrap();
