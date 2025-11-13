import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Post extends Document {
    @Prop()
    text: string;

    @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
    creator: Types.ObjectId;

    @Prop([String])
    pictureFile: string[];
}

export const PostSchema = SchemaFactory.createForClass(Post);
