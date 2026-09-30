import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Sector extends Document {
    @Prop({ type: Types.ObjectId, ref: 'Domain' })
    domain_id!: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    creator_id!: Types.ObjectId;

    @Prop({ required: true })
    title!: string;

    @Prop()
    status?: string;

    @Prop()
    link?: string;

    @Prop({
        type: [
            {
                _id: { type: Types.ObjectId, ref: "User", required: true },
                user_name: { type: String },
                isAdmin: {type: Boolean, default: false}
                // role: { type: String, enum: ["admin", "member"], default: "member" },
                // public_key: { type: String, required: true }
            }
        ], default: []
    })
    members!: { _id: Types.ObjectId; user_name: string; isAdmin: boolean }[];
}

export const SectorSchema = SchemaFactory.createForClass(Sector);
