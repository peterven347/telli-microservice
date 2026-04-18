import { Injectable } from '@nestjs/common';
import { PostDto } from '@app/dtos/auth.dto';
import { Post } from '@app/schemas/post.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';


@Injectable()
export class PostService {
	constructor(@InjectModel(Post.name) private postModel: Model<Post>) { }

	async getPosts(cursor?: string) {
		const query = cursor && Types.ObjectId.isValid(cursor) ? { _id: { $lt: cursor } } : {}
		const posts: any = await this.postModel
			.find(query)
			.sort({ _id: -1 })
			.limit(10).populate({path: "creator", select: "first_name logo"})

		const nextPageCursor = posts.length > 0 ? posts[posts.length - 1]._id.toString() : null;
		return { posts, nextPageCursor };
	}

	async createPost(payload: any) {
		try {
			const post = await this.postModel.create(
				payload.file && payload.file.length >= 1 ?
					{
						text: payload.text,
						pictureFile: payload.file.map(i => i.filename),
						creator_id: "689b313009da3e3f85c3408c"
					}
					:
					{
						text: payload.text,
						creator_id: "689b313009da3e3f85c3408c"
					}
			)
			return post
		} catch (err) {
			console.log(err)
		}
	};
}
