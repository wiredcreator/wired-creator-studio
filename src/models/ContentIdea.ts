import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// --- Status & Source Enums ---
export type ContentIdeaStatus =
  | 'suggested'
  | 'approved'
  | 'rejected'
  | 'saved'
  | 'scripted'
  | 'filmed'
  | 'published';

export type ContentIdeaSource =
  | 'brain_dump'
  | 'ai_generated'
  | 'trend_scrape'
  | 'manual';

// --- Trend Data Sub-document ---
export interface ITrendData {
  sourceUrl: string;
  platform: string;
  metrics: Record<string, unknown>;
}

const TrendDataSchema = new Schema<ITrendData>(
  {
    sourceUrl: { type: String, default: '' },
    platform: { type: String, default: '' },
    metrics: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

// --- Content Idea Document ---
export interface IContentIdea extends Document {
  userId: Types.ObjectId;
  title: string;
  description: string;
  status: ContentIdeaStatus;
  source: ContentIdeaSource;
  trendData?: ITrendData;
  contentPillar: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ContentIdeaSchema = new Schema<IContentIdea>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['suggested', 'approved', 'rejected', 'saved', 'scripted', 'filmed', 'published'],
      default: 'suggested',
    },
    source: {
      type: String,
      enum: ['brain_dump', 'ai_generated', 'trend_scrape', 'manual'],
      required: true,
    },
    trendData: { type: TrendDataSchema },
    contentPillar: { type: String, default: '' },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

// Index for efficient querying by user + status
ContentIdeaSchema.index({ userId: 1, status: 1 });

const ContentIdea: Model<IContentIdea> =
  mongoose.models.ContentIdea ||
  mongoose.model<IContentIdea>('ContentIdea', ContentIdeaSchema);

export default ContentIdea;
