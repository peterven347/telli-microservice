import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Sector extends Document {
    @Prop({ type: Types.ObjectId, ref: 'Domain' })
    domain_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    creator_id: Types.ObjectId;

    @Prop({ required: true })
    title: string;

    @Prop()
    status?: string;

    @Prop()
    link?: string;

    @Prop()
    logo?: string;

    @Prop({
        type: [
            {
                _id: { type: Types.ObjectId, ref: "User", required: true },
                role: { type: String, enum: ["admin", "member"], required: true },
                public_key: { type: String, required: true }
            }
        ], default: []
    })
    members: { user_id: Types.ObjectId; role: string; public_key: string }[]

    @Prop({ type: [Object], default: [] })
    data: any[];
}

export const SectorSchema = SchemaFactory.createForClass(Sector);
