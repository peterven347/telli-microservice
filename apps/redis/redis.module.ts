import {Global, Module } from '@nestjs/common';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
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
        //   password: process.env.REDIS_PASSWORD,
        });
      },
    },
  ],
  exports: ["REDIS_SUBSCRIBER", "REDIS_CLIENT"],
})
export class RedisModule {}