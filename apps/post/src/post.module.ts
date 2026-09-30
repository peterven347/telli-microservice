import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { MongooseModule } from '@nestjs/mongoose';
<<<<<<< HEAD
import { Comment, CommentSchema, Like, LikeSchema, Post, PostSchema } from 'apps/post/src/post.schema';
=======
import { Post, PostSchema } from '@app/schemas/post.schema';
import { User, UserSchema } from "@app/schemas/user.schema"
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: Post.name, schema: PostSchema },
<<<<<<< HEAD
			{ name: Comment.name, schema: CommentSchema },
			{ name: Like.name, schema: LikeSchema }
		]),
=======
			// { name: User.name, schema: UserSchema }
		]),
		// MongooseModule.forRoot('mongodb://127.0.0.1:27017/post_db')
>>>>>>> 94a7fbfc780613842713ee0020540e3010689348
	],
	controllers: [PostController],
	providers: [PostService],
})

export class PostModule { }
