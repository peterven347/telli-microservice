import { Module } from '@nestjs/common';
import { CassandraService } from './cassandra.service';
import { ChatMessagesService } from './chat-messages.service';

@Module({
  providers: [CassandraService, ChatMessagesService],
<<<<<<< HEAD
=======
  // exports: [ChatMessagesService],
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
  exports: [CassandraService, ChatMessagesService],
})
export class CassandraModule { }