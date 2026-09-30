import { Injectable, Inject, NotFoundException, InternalServerErrorException } from "@nestjs/common";
import { Redis } from 'ioredis';
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { CreateLivestreamDto } from '../dto/create-livestream.dto';
import { SocketPublisherService } from "libs/socket-publisher/socket-publisher.service";


interface LivestreamRecord {
    _id: string;
    user_name: string;
    bio: string;
}

interface UserProfile {
    user_name: string;
    bio: string;
}

interface CommentInput {
    userId: string;
    text: string;
}

interface Comment {
    id: string;
    text: string;
    createdAt: string;
}

const ACTIVE_LIVESTREAMS = "livestreams:active";
const MAX_COMMENTS_PER_STREAM = 500;

@Injectable()
export class LivestreamService {
    constructor(
        @Inject("REDIS_SUBSCRIBER") private readonly subscriber: Redis,
        private readonly httpService: HttpService,
        private readonly socketPublisher: SocketPublisherService
    ) { }

    private commentsKey(streamId: string): string {
        return `comments:${streamId}`;
    }

    async create(userId: string) {
        const user = await this.fetchUserProfile(userId);
        const record: LivestreamRecord = {
            _id: userId,
            user_name: user.user_name,
            bio: user.bio,
        };
        const pipeline = this.subscriber.pipeline();
        pipeline.hset(userId, record);
        pipeline.sadd(ACTIVE_LIVESTREAMS, userId);
        await pipeline.exec();
        return record
    }

    async stop(userId: string) {
        try {
            const pipeline = this.subscriber.pipeline();
            pipeline.del(userId);
            pipeline.srem(ACTIVE_LIVESTREAMS, userId);
            pipeline.del(this.commentsKey(userId));
            await pipeline.exec();
            await this.socketPublisher.emitToRoom('endLiveStream', `liveStream:${userId}`, {});
            return { success: true }
        } catch (err) {
            console.log(err)
            return
        }
    }

    async findAll(userId: string): Promise<LivestreamRecord[]> {
        const activeIds = (await this.subscriber.smembers(ACTIVE_LIVESTREAMS)).filter(id => id !== userId);
        if (activeIds.length === 0) return [];

        const pipeline = this.subscriber.pipeline();
        activeIds.forEach((id) => pipeline.hgetall(id));
        const results = await pipeline.exec();

        return (results ?? [])
            .map(([err, data]) => (err ? null : (data as unknown as LivestreamRecord)))
            .filter((r): r is LivestreamRecord => !!r && Object.keys(r).length > 0);
    }

    //     async findOne(userId: string): Promise<LivestreamRecord> {
    //     const data = await this.subscriber.hgetall(userId);

    //     if (!data || Object.keys(data).length === 0) {
    //         throw new NotFoundException(`No active livestream for user ${userId}`);
    //     }

    //     return data as unknown as LivestreamRecord;
    // }

    async getComments(streamId: string, limit = 100): Promise<Comment[]> {
        const key = streamId;
        const raw = await this.subscriber.lrange(key, -limit, -1);
        return raw.map((entry) => JSON.parse(entry) as Comment);
    }

    private async fetchUserProfile(userId: string): Promise<UserProfile> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`http://localhost:4004/find-one/id/${userId}`),
            );
            const { user_name, bio } = response.data;
            return { user_name, bio };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.log(error)
            throw new InternalServerErrorException(
                `Failed to fetch user profile for ${userId}: ${message}`,
            );
        }
    }
}
