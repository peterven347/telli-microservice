import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class User extends Document {
    @Prop({ required: true })
    first_name: string;

    @Prop({ required: true })
    last_name: string;

    @Prop()
    bio: string;

    @Prop({
        required: true,
        lowercase: true,
        match: [/.+@.+\..+/, 'Please provide a valid email address'],
    })
    email: string;

    @Prop({ required: true })
    phone_number: string;

    @Prop({ required: true })
    password: string;

    @Prop({ required: true })
    logo: string;

    @Prop({ required: true })
    backdrop: string;

    @Prop([String])
    fcmTokens: string[];

    @Prop([{ type: Types.ObjectId, ref: 'Sector' }])
    sectors: Types.ObjectId[];

    @Prop({ type: Date, default: Date.now })
    last_seen: Date;

    @Prop([{ type: Types.ObjectId, ref: 'Post' }])
    likedPosts: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);
