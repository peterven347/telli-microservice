import { NestFactory } from '@nestjs/core';
import { CallModule } from './call.module';

async function bootstrap() {
  const app = await NestFactory.create(CallModule);
  await app.listen(process.env.port ?? 3001);
}
bootstrap();
