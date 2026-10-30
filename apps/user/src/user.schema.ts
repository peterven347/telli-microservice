import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class User extends Document {
    @Prop({ required: true, lowercase: true, trim: true })
    user_name!: string;

    // @Prop({ required: true })
    // last_name: string;

    @Prop({ trim: true })
    bio!: string;

    @Prop({
        required: true,
        lowercase: true,
        trim: true,
        match: [/.+@.+\..+/, 'Please provide a valid email address'],
    })
    email!: string;

    @Prop({ required: true })
    phone_number!: string;

    @Prop({ required: true })
    country_code!: string;

    @Prop({ required: true })
    publicKey!: string;

    @Prop({ required: true })
    password!: string;

    @Prop({})
    backdrop!: string;

    @Prop([String])
    fcmTokens!: string[];

    @Prop([{ type: MongooseSchema.Types.ObjectId, ref: 'Sector' }])
    sectors!: Types.ObjectId[];

    @Prop({ type: Date, default: Date.now })
    last_seen!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index(
    { user_name: 1 },
    { unique: true, collation: { locale: 'en', strength: 2 } },
);
