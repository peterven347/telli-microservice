import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, types } from 'cassandra-driver';

@Injectable()
export class CassandraService implements OnModuleInit {
    private client!: Client;
    private readonly logger = new Logger(CassandraService.name);

    async onModuleInit() {
        await this.connect();
    }

    private async connect() {
        try {
            this.client = new Client({
                contactPoints: ['127.0.0.1'],
                localDataCenter: 'datacenter1',
                authProvider: undefined,
            });

            await this.client.connect();
            this.logger.log(`Connected to Cassandra cluster}`);
            await this.createKeyspace();
        } catch (error: any) {
            this.logger.error(`Failed to connect to Cassandra: ${error.message}`);
            throw error;
        }
    }

    private async createKeyspace() {
        const keyspace = 'telli';
        const query = `
            CREATE KEYSPACE IF NOT EXISTS ${keyspace}
            WITH REPLICATION = {
                'class': 'SimpleStrategy',
                'replication_factor': 3
            }
        `;
        try {
            await this.client.execute(query);
            this.logger.log(`Keyspace '${keyspace}' created or already exists`);
        } catch (error: any) {
            this.logger.error(`Failed to create keyspace: ${error.message}`);
        }
    }

    private async execute(query: string, params?: any[], options?: any): Promise<types.ResultSet> {
        try {
            return await this.client.execute(query, params, options);
        } catch (error: any) {
            this.logger.error(`Query execution failed: ${error.message}`, error);
            throw error;
        }
    }

    async createTable(tableName: string, schema: string, options?: string) {
        const query = `
            CREATE TABLE IF NOT EXISTS telli.${tableName} (
            ${schema}
            )
            ${options || ''}
         `;
        await this.execute(query);
        this.logger.log(`Table '${tableName}' created or already exists`);
    }

    async insert(tableName: string, dataObj: Record<string, any>) {
        const query = `
            INSERT INTO telli.chat_messages (
                 id, sector_id, created_at, mdg_id, domain_id, creator_id, note, type, uri
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            dataObj._id,
            dataObj.sector_id,
            dataObj.createdAt,
            dataObj.id,
            dataObj.domain_id,
            dataObj.creator_id,
            dataObj.note,
            dataObj.type,
            dataObj.uri,
        ];
        return this.execute(query, params, { prepare: true });
    }

    async select(tableName: string, where?: Record<string, any>, limit?: number) {
        let query = `SELECT * FROM ${tableName}`;
        if (where && Object.keys(where).length > 0) {
            const conditions = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
            query += ` WHERE ${conditions}`;
        }
        if (limit) {
            query += ` LIMIT ${limit}`;
        }
        const params = where ? Object.values(where) : [];
        return this.execute(query, params);
    }

    async update(tableName: string, data: Record<string, any>, where: Record<string, any>) {
        const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');

        const query = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;

        const params = [...Object.values(data), ...Object.values(where)];
        return this.execute(query, params);
    }

    async delete(tableName: string, where: Record<string, any>) {
        const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
        const query = `DELETE FROM ${tableName} WHERE ${whereClause}`;

        return this.execute(query, Object.values(where));
    }

    async disconnect() {
        if (this.client) {
            await this.client.shutdown();
            this.logger.log('Disconnected from Cassandra');
        }
    }
}