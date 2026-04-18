import { Module } from '@nestjs/common';
import { CassandraService } from './cassandra.service';
import { ChatMessagesService } from './chat-messages.service';

@Module({
  providers: [CassandraService, ChatMessagesService],
  // exports: [ChatMessagesService],
  exports: [CassandraService, ChatMessagesService],
})
export class CassandraModule { }