import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PostDocument = HydratedDocument<Post>;
export type commentDocument = HydratedDocument<Comment>;
export type LikeDocument = HydratedDocument<Like>;

@Schema({ timestamps: !true })
export class Post {
	@Prop({ required: true })
	text!: string;

	@Prop({ type: [String], default: [] })
	images!: string[];

	@Prop({ type: Types.ObjectId, ref: 'User', required: true })
	creator_id!: Types.ObjectId;

	@Prop({ required: true })
	creator_name!: string;

	@Prop({default: 0})
	numLikes!: number

	@Prop({ default: 0 })
	numComments!: number;
}

@Schema({ timestamps: !true })
export class Comment {
	@Prop()
	text!: string;

	@Prop([String])
	images!: string[];

	@Prop({ type: Types.ObjectId, ref: 'User', required: true })
	creator_id!: Types.ObjectId

	@Prop({ required: true })
	creator_name!: string;

	@Prop({ type: Types.ObjectId, ref: "Post", required: true })
	parent_post_id!: Types.ObjectId;

	@Prop({default: 0})
	numLikes!: number

	@Prop({ default: 0 })
	numComments!: number;
}

@Schema({})
export class Like {
	@Prop({ type: Types.ObjectId, ref: 'User', required: true })
	creator_id!: Types.ObjectId

	@Prop({ type: Types.ObjectId, required: true })
	post_id!: Types.ObjectId;
}

export const PostSchema = SchemaFactory.createForClass(Post);
export const CommentSchema = SchemaFactory.createForClass(Comment);
export const LikeSchema = SchemaFactory.createForClass(Like);
LikeSchema.index({ creator_id: 1, post_id: 1 }, { unique: true });
