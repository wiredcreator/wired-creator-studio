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
  | 'manual'
  | 'voice_storm';

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

// --- Resource Sub-document ---
export interface IResource {
  _id?: Types.ObjectId;
  type: 'text' | 'file';
  name: string;
  content: string; // text content or file URL
  fileType?: string; // e.g. 'pdf', 'doc'
  createdAt?: Date;
}

const ResourceSchema = new Schema<IResource>(
  {
    type: { type: String, enum: ['text', 'file'], required: true },
    name: { type: String, required: true },
    content: { type: String, default: '' },
    fileType: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
);

// --- Concept Answers Sub-document ---
export interface IConceptAnswers {
  whoIsThisFor: string;
  whatWillTheyLearn: string;
  whyShouldTheyCare: string;
}

const ConceptAnswersSchema = new Schema<IConceptAnswers>(
  {
    whoIsThisFor: { type: String, default: '' },
    whatWillTheyLearn: { type: String, default: '' },
    whyShouldTheyCare: { type: String, default: '' },
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
  rejectionReason: string;
  sourceSessionId?: Types.ObjectId;
  approvedAt?: Date;
  rejectedAt?: Date;
  conceptAnswers?: IConceptAnswers;
  callToAction: string;
  alternativeTitles: string[];
  resources: IResource[];
  outline: string;
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
      enum: ['brain_dump', 'ai_generated', 'trend_scrape', 'manual', 'voice_storm'],
      required: true,
    },
    trendData: { type: TrendDataSchema },
    contentPillar: { type: String, default: '' },
    tags: [{ type: String }],
    rejectionReason: { type: String, default: '' },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    conceptAnswers: { type: ConceptAnswersSchema },
    callToAction: { type: String, default: '' },
    alternativeTitles: [{ type: String }],
    resources: [{ type: ResourceSchema }],
    outline: { type: String, default: '' },
    sourceSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'VoiceStormingTranscript',
    },
  },
  { timestamps: true }
);

// Index for efficient querying by user + status
ContentIdeaSchema.index({ userId: 1, status: 1 });

// Soft delete support
import { applySoftDelete } from '@/lib/soft-delete';
applySoftDelete(ContentIdeaSchema);

const ContentIdea: Model<IContentIdea> =
  mongoose.models.ContentIdea ||
  mongoose.model<IContentIdea>('ContentIdea', ContentIdeaSchema);

export default ContentIdea;
