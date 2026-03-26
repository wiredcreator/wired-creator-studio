import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// --- Generated Idea Sub-document ---
export interface IScoutGeneratedIdea {
  title: string;
  description: string;
  sourceVideoUrl: string;
  sourceVideoTitle: string;
  category: string;
}

const ScoutGeneratedIdeaSchema = new Schema<IScoutGeneratedIdea>(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    sourceVideoUrl: { type: String, default: '' },
    sourceVideoTitle: { type: String, default: '' },
    category: { type: String, default: '' },
  },
  { _id: false }
);

// --- Cached Video Sub-document (same shape as YouTubeChannelCache) ---
export interface IScoutVideo {
  videoId: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  channelName: string;
  viewCount: number;
  publishedAt: Date;
  description: string;
}

const ScoutVideoSchema = new Schema<IScoutVideo>(
  {
    videoId: { type: String, required: true },
    title: { type: String, default: '' },
    url: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    channelName: { type: String, default: '' },
    viewCount: { type: Number, default: 0 },
    publishedAt: { type: Date },
    description: { type: String, default: '' },
  },
  { _id: false }
);

// --- Content Scout Result Document ---
export interface IContentScoutResult extends Document {
  userId: Types.ObjectId;
  videos: IScoutVideo[];
  generatedIdeas: IScoutGeneratedIdea[];
  generatedAt: Date;
}

const ContentScoutResultSchema = new Schema<IContentScoutResult>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    videos: [ScoutVideoSchema],
    generatedIdeas: [ScoutGeneratedIdeaSchema],
    generatedAt: { type: Date, default: Date.now },
  }
);

ContentScoutResultSchema.index({ userId: 1 });

const ContentScoutResult: Model<IContentScoutResult> =
  mongoose.models.ContentScoutResult ||
  mongoose.model<IContentScoutResult>('ContentScoutResult', ContentScoutResultSchema);

export default ContentScoutResult;
