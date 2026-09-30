import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaService } from './kafka.service';
import { KafkaProducer } from './kafka.producer';
import { KafkaConsumer } from './kafka.consumer';
import { CassandraModule } from 'apps/cassandra/src';
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
})
export class KafkaModule { }