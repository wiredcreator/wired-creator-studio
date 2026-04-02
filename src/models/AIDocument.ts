import mongoose, { Schema, Document, Types } from 'mongoose';

export const AI_DOCUMENT_CATEGORIES = [
  'idea_generation',
  'script_generation',
  'brain_dump_processing',
  'tone_of_voice',
  'side_quest_generation',
  'content_pillar_generation',
  'personal_baseline_processing',
] as const;

export type AIDocumentCategory = (typeof AI_DOCUMENT_CATEGORIES)[number];

export const AI_DOCUMENT_SCOPES = ['global', 'user'] as const;
export type AIDocumentScope = (typeof AI_DOCUMENT_SCOPES)[number];

export interface IAIDocument extends Document {
  category: AIDocumentCategory;
  scope: AIDocumentScope;
  userId: Types.ObjectId | null;
  title: string;
  content: string;
  sortOrder: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AIDocumentSchema = new Schema<IAIDocument>(
  {
    category: {
      type: String,
      enum: AI_DOCUMENT_CATEGORIES,
      required: true,
    },
    scope: {
      type: String,
      enum: AI_DOCUMENT_SCOPES,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    title: {
      type: String,
      required: true,
      maxlength: 500,
    },
    content: {
      type: String,
      required: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

AIDocumentSchema.index({ category: 1, scope: 1 });
AIDocumentSchema.index({ category: 1, userId: 1 });
AIDocumentSchema.index({ createdBy: 1 });

export default mongoose.models.AIDocument ||
  mongoose.model<IAIDocument>('AIDocument', AIDocumentSchema);
