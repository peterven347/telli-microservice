import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Domain extends Document {
    @Prop({ required: true })
    domain: string;

    @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
    creator_id: Types.ObjectId;

    @Prop({ default: '' })
    logo: string;

    @Prop()
    link: string;

    @Prop({
        type: {
            ALLOW_EDIT: { type: String, default: 'owner' },
            ALLOW_ADD_SECTOR: { type: String, default: 'owner' },
        },
        _id: false, // prevent subdocument from generating its own _id
    })
    settings: {
        ALLOW_EDIT: string;
        ALLOW_ADD_SECTOR: string;
    };
}

export const DomainSchema = SchemaFactory.createForClass(Domain);

// DomainSchema.virtual('sectors', {
//     ref: 'Sector',
//     localField: '_id',
//     foreignField: 'domain_id',
// });

// DomainSchema.set('toObject', { virtuals: true });
// DomainSchema.set('toJSON', { virtuals: true });


