import { Injectable, OnModuleInit } from '@nestjs/common';
import { types } from 'cassandra-driver';
import { CassandraService } from './cassandra.service';

export interface ChatMessage {
    id: string,
    _id: string,
    domain_id: string,
    sector_id: string,
    creator_id: string,
    createdAt: types.TimeUuid,
    note: string,
    type: string,
    uri: string,
}

@Injectable()
export class ChatMessagesService implements OnModuleInit {
    constructor(private readonly cassandraService: CassandraService) { }
    async onModuleInit() {
        const schema = `
            id text,
            sector_id text,
            created_at timestamp,
            mdg_id text,
            domain_id text,
            creator_id text,
            note text,
            type text,
            uri text,
            PRIMARY KEY ((sector_id), created_at, id)`;
        const options = `WITH CLUSTERING ORDER BY (created_at DESC, id ASC)`;
        await this.cassandraService.createTable('chat_messages', schema, options);
    }

    async saveMessage(message: ChatMessage) {
        return this.cassandraService.insert('chat_messages', message);
    }

    async getMessagesByConversation(conversationId: string, limit = 50) {
        return this.cassandraService.select('chat_messages', { conversation_id: conversationId }, limit);
    }

    async getMessage(conversationId: string, messageId: string) {
        const result = await this.cassandraService.select('chat_messages', {
            conversation_id: conversationId,
            message_id: messageId,
        });
        return result.rows[0];
    }

    async updateMessageStatus(conversationId: string, messageId: string, status: string) {
        return this.cassandraService.update(
            'chat_messages',
            { status },
            { conversation_id: conversationId, message_id: messageId }
        );
    }
}