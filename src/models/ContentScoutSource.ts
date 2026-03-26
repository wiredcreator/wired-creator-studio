import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// --- Source Type ---
export type ContentScoutSourceType = 'manual' | 'discovered';

// --- Content Scout Source Document ---
export interface IContentScoutSource extends Document {
  userId: Types.ObjectId;
  channelUrl: string;
  channelName: string;
  channelThumbnail: string;
  channelId?: string;
  source: ContentScoutSourceType;
  addedAt: Date;
}

const ContentScoutSourceSchema = new Schema<IContentScoutSource>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    channelUrl: { type: String, required: true },
    channelName: { type: String, default: '' },
    channelThumbnail: { type: String },
    channelId: { type: String, default: '' },
    source: {
      type: String,
      enum: ['manual', 'discovered'],
      required: true,
    },
    addedAt: { type: Date, default: Date.now },
  }
);

// Compound unique index — one entry per channel per user
ContentScoutSourceSchema.index({ userId: 1, channelUrl: 1 }, { unique: true });

const ContentScoutSource: Model<IContentScoutSource> =
  mongoose.models.ContentScoutSource ||
  mongoose.model<IContentScoutSource>('ContentScoutSource', ContentScoutSourceSchema);

export default ContentScoutSource;
