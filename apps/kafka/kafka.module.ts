import { Module, Global } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { KafkaProducer } from './kafka.producer';
import { KafkaConsumer } from './kafka.consumer';
import { CassandraModule } from 'apps/cassandra/src';
import { SocketGateway } from 'apps/socket/socket.service';
import { RedisModule } from 'apps/redis/redis.module';
import { UserModule } from 'apps/user/src/user.module';

@Module({
  imports: [CassandraModule, RedisModule, UserModule],
  providers: [SocketGateway, KafkaService, KafkaProducer, KafkaConsumer],
  exports: [KafkaService, KafkaProducer, UserModule],
})
export class KafkaModule { }