import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Post, PostSchema } from '@app/schemas/post.schema';
import { User, UserSchema } from "@app/schemas/user.schema"

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: Post.name, schema: PostSchema },
			// { name: User.name, schema: UserSchema }
		]),
		// MongooseModule.forRoot('mongodb://127.0.0.1:27017/post_db')
	],
	controllers: [PostController],
	providers: [PostService],
})

export class PostModule { }
