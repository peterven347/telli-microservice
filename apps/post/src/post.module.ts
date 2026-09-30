import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Comment, CommentSchema, Like, LikeSchema, Post, PostSchema } from 'apps/post/src/post.schema';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: Post.name, schema: PostSchema },
			{ name: Comment.name, schema: CommentSchema },
			{ name: Like.name, schema: LikeSchema }
		]),
	],
	controllers: [PostController],
	providers: [PostService],
})

export class PostModule { }
