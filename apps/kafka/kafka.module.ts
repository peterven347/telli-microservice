import { Module, Global } from '@nestjs/common';
<<<<<<< HEAD
import { ConfigModule } from '@nestjs/config';
=======
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
import { KafkaService } from './kafka.service';
import { KafkaProducer } from './kafka.producer';
import { KafkaConsumer } from './kafka.consumer';
import { CassandraModule } from 'apps/cassandra/src';
<<<<<<< HEAD
import { RedisModule } from 'apps/redis/redis.module';
import { SocketPublisherModule } from 'libs/socket-publisher/socket-publisher.module';


@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		CassandraModule,
		RedisModule,
		SocketPublisherModule
	],
	providers: [KafkaService, KafkaProducer, KafkaConsumer],
	exports: [KafkaService, KafkaProducer],
=======
import { SocketGateway } from 'apps/socket/socket.service';
import { RedisModule } from 'apps/redis/redis.module';
import { UserModule } from 'apps/user/src/user.module';

@Module({
  imports: [CassandraModule, RedisModule, UserModule],
  providers: [SocketGateway, KafkaService, KafkaProducer, KafkaConsumer],
  exports: [KafkaService, KafkaProducer, UserModule],
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
})
export class KafkaModule { }