import {Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
<<<<<<< HEAD
=======
import { REDIS_CLIENT } from './redis.constants';
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348

@Global()
@Module({
  providers: [
    {
<<<<<<< HEAD
      provide: "REDIS_SUBSCRIBER",
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST as string,
          port: 6379,
        //   password: process.env.REDIS_PASSWORD,
        });
      },
    },
    {
      provide: "REDIS_CLIENT",
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST as string,
          port: 6379,
=======
      provide: REDIS_CLIENT,
      useFactory: () => {
        return new Redis({
        //   host: process.env.REDIS_HOST,
        //   port: Number(process.env.REDIS_PORT),
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
        //   password: process.env.REDIS_PASSWORD,
        });
      },
    },
  ],
<<<<<<< HEAD
  exports: ["REDIS_SUBSCRIBER", "REDIS_CLIENT"],
=======
  exports: [REDIS_CLIENT],
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
})
export class RedisModule {}