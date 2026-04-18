import {Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        return new Redis({
        //   host: process.env.REDIS_HOST,
        //   port: Number(process.env.REDIS_PORT),
        //   password: process.env.REDIS_PASSWORD,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}