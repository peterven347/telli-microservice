import { Injectable } from '@nestjs/common';
import { Comment, Post, Like } from './post.schema';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId, Model, Types } from 'mongoose';
import { post } from 'axios';
import { v2 as cloudinary } from "cloudinary"
import { ConfigService } from '@nestjs/config';
import { timestamp } from 'rxjs';


@Injectable()
export class PostService {
	constructor(
		private readonly configService: ConfigService,
		@InjectModel(Post.name) private postModel: Model<Post>,
		@InjectModel(Comment.name) private commentModel: Model<Comment>,
		@InjectModel(Like.name) private likeModel: Model<Like>
	) { }

	generateSignature(postId, unid, timestamp) {
		const params = {
			timestamp,
			folder: 'posts',
			public_id: `${postId}-${unid}`,
		};
		const signature = cloudinary.utils.api_sign_request(
			params, this.configService.get<string>("CLOUDINARY_API_SECRET")!
		)
		return {
			signature,
			apiKey: this.configService.get<string>("CLOUDINARY_API_KEY"),
			cloudName: this.configService.get<string>("CLOUDINARY_CLOUD_NAME")
		}
	}

	// async getPosts(userId: string, cursor?: string) {
	// 	const query = cursor && Types.ObjectId.isValid(cursor) ? { _id: { $lt: cursor } } : {}
	// 	const posts: any = await this.postModel
	// 		.find(query)
	// 		.sort({ _id: -1 })
	// 		.limit(10)

	// 	const nextPageCursor = posts.length > 0 ? posts[posts.length - 1]._id.toString() : null;
	// 	return { posts, nextPageCursor };
	// };
	async getPosts(userId: string, cursor?: string) {
		const matchStage = cursor && Types.ObjectId.isValid(cursor)
			? { _id: { $lt: new Types.ObjectId(cursor) } }
			: {};

		const posts: any = await this.postModel.aggregate([
			{ $match: matchStage },
			{ $sort: { _id: -1 } },
			{ $limit: 10 },
			{
				$lookup: {
					from: 'likes',
					let: { postId: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ['$post_id', '$$postId'] },
										{ $eq: ['$creator_id', new Types.ObjectId(userId)] },
									],
								},
							},
						},
						{ $limit: 1 },
					],
					as: 'userLike',
				},
			},
			{
				$addFields: {
					isLiked: { $gt: [{ $size: '$userLike' }, 0] },
				},
			},
			{ $project: { userLike: 0 } },
		]);
		const nextPageCursor = posts.length > 0 ? posts[posts.length - 1]._id.toString() : null;
		return { posts, nextPageCursor };
	}

	async getUserPosts(userId: string, cursor?: string) {
		console.log("start")
		const query = cursor && Types.ObjectId.isValid(cursor) ? { _id: { $lt: new Types.ObjectId(cursor) }, creator_id: new Types.ObjectId(userId) } : { creator_id: new Types.ObjectId(userId) }
		const posts: any = await this.postModel
			.find(query)
			.sort({ _id: -1 })
			.limit(10)

		const nextPageCursor = posts.length > 0 ? posts[posts.length - 1]._id.toString() : null;
		console.log(posts)
		return { posts, nextPageCursor };
	};

	async getcomments(postId: string, cursor?: string) {
		if (!Types.ObjectId.isValid(postId)) {
			throw new Error("Invalid ID format");
		}
		const query = cursor && Types.ObjectId.isValid(cursor)
			? {
				_id: { $lt: new Types.ObjectId(cursor) },
				parent_post_id: new Types.ObjectId(postId),
			}
			: {
				parent_post_id: new Types.ObjectId(postId),
			};
		const comments: any = await this.commentModel
			.find(query)
			.sort({ _id: -1 })
			.limit(10)
		const nextPageCursor = comments.length > 0 ? comments[comments.length - 1]._id.toString() : null;
		return { comments, nextPageCursor };
	};

	async createPost(payload: any) {
		try {
			const timestamp = Math.round(new Date().getTime() / 1000)
			const postId = new Types.ObjectId();
			const list: any[] = []
			for (let i = 0; i < payload.numImages; i++) {
				const unid = Math.random().toString(36).substring(2);
				const tt = this.generateSignature(postId, unid, timestamp);
				list.push({
					signature: tt.signature,
					unid,
				});
			}
			const post = new this.postModel(
				{
					_id: postId,
					text: payload.text,
					images: list.map(i => i.unid),
					creator_id: Types.ObjectId.createFromHexString(payload.id),
					creator_name: payload.userName
				}
			)
			await post.save()
			return {
				success: true, data: {
					...post.toObject(),
					timestamp,
					images: list,
					apiKey: payload.numImages > 0 ? this.configService.get<string>("CLOUDINARY_API_KEY") : null,
					cloudName: payload.numImages > 0 ? this.configService.get<string>("CLOUDINARY_CLOUD_NAME") : null
				}
			}
		} catch (err) {
			console.log(err)
		}
	};

	async createComment(payload: any) {
		let doc;
		if (payload.isForAComment === true) {
			doc = await this.commentModel.findByIdAndUpdate(payload.postId, { $inc: { numComments: 1 } });
		} else {
			doc = await this.postModel.findByIdAndUpdate(payload.postId, { $inc: { numComments: 1 } });
		}
		const post = doc;
		if (!post) {
			return { success: false, message: "post not found" }
		}
		const timestamp = Math.round(new Date().getTime() / 1000)
		const postId = new Types.ObjectId();
		const list: any[] = []

		for (let i = 0; i < payload.numImages; i++) {
			const unid = Math.random().toString(36).substring(2);
			const tt = this.generateSignature(postId, unid, timestamp);
			list.push({
				signature: tt.signature,
				unid,
			});
		}
		const comment = new this.commentModel(
			{
				_id: postId,
				parent_post_id: post._id,
				text: payload.text,
				images: list.map(i => i.unid),
				creator_id: payload.id,
				creator_name: payload.userName
			}
		)
		await comment.save()
		return {
			success: true, data: {
				...comment.toObject(),
				timestamp,
				images: list,
				apiKey: this.configService.get<string>("CLOUDINARY_API_KEY"),
				cloudName: this.configService.get<string>("CLOUDINARY_CLOUD_NAME")
			}
		}
	};

	async likePost(payload: any) {
		const existing = await this.likeModel.findOne({ creator_id: payload.userId, post_id: payload.postId });
		if (!existing) {
			await this.likeModel.create({
				creator_id: payload.userId,
				post_id: payload.postId
			})
			let doc;
			doc = await this.postModel.updateOne({ _id: payload.postId }, { $inc: { numLikes: 1 } });
			if (doc) {
				return { success: true, liked: true }
			} else {
				return { success: false, message: "post not found" }
			}
		} else {
			await this.likeModel.deleteOne({ _id: existing._id });
			let doc;
			doc = await this.postModel.updateOne({ _id: payload.postId }, { $inc: { numLikes: -1 } });
			if (doc) {
				return { success: true, liked: false }
			} else {
				return { success: false, message: "post not found" }
			}
		}
	};

	async likeComment(payload: any) {
		const existing = await this.likeModel.findOne({ creator_id: payload.userId, post_id: payload.postId });
		if (!existing) {
			await this.likeModel.create({
				creator_id: payload.userId,
				post_id: payload.postId
			})
			let doc;
			doc = await this.commentModel.updateOne({ _id: payload.postId }, { $inc: { numLikes: 1 } });
			if (doc) {
				return { success: true, liked: true }
			} else {
				return { success: false, message: "post not found" }
			}
		} else {
			await this.likeModel.deleteOne({ _id: existing._id });
			let doc;
			doc = await this.commentModel.updateOne({ _id: payload.postId }, { $inc: { numLikes: -1 } });
			if (doc) {
				return { success: true, liked: false }
			} else {
				return { success: false, message: "post not found" }
			}
		}
	};

	async deletePost(payload: any) {
		await this.likeModel.deleteMany({ post_id: payload.postId })
		await this.commentModel.deleteMany({ post_id: payload.postId })
		await this.postModel.deleteOne({ _id: payload.postId })
		return { success: true }
	};
}
