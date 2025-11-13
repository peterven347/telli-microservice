import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Message extends Document {
    @Prop({ type: Types.ObjectId, ref: "Sector" })
    sector_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    creator_id: Types.ObjectId;

    @Prop()
    note?: string;

    @Prop({ type: [Object], default: [] })
    pictures: any[];

    //add timestamps
}

export const MessageSchema = SchemaFactory.createForClass(Message);