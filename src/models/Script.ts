import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// --- Status Enum ---
export type ScriptStatus = 'draft' | 'review' | 'approved' | 'filming' | 'completed' | 'published';

// --- Feedback Sub-document ---
export interface IScriptFeedback {
  userId: Types.ObjectId;
  text: string;
  createdAt: Date;
}

const ScriptFeedbackSchema = new Schema<IScriptFeedback>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// --- Section Sub-document ---
export interface IScriptSection {
  id: string;
  title: string;
  content: string;
  source: 'ai' | 'user';
  order: number;
}

const ScriptSectionSchema = new Schema<IScriptSection>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, default: '' },
    content: { type: String, default: '' },
    source: { type: String, enum: ['ai', 'user'], default: 'user' },
    order: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

// --- Script Document ---
export interface IScript extends Document {
  userId: Types.ObjectId;
  ideaId: Types.ObjectId;
  title: string;
  fullScript: string;
  bulletPoints: string[];
  teleprompterVersion: string;
  sections: IScriptSection[];
  platforms: string[];
  voiceStormTranscriptId?: Types.ObjectId;
  thumbnail?: string;
  notes?: string;
  status: ScriptStatus;
  feedback: IScriptFeedback[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const ScriptSchema = new Schema<IScript>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ideaId: {
      type: Schema.Types.ObjectId,
      ref: 'ContentIdea',
      required: true,
    },
    title: { type: String, required: true },
    fullScript: { type: String, required: true },
    bulletPoints: [{ type: String }],
    teleprompterVersion: { type: String, default: '' },
    sections: [ScriptSectionSchema],
    platforms: [{ type: String }],
    voiceStormTranscriptId: {
      type: Schema.Types.ObjectId,
      ref: 'VoiceStormingTranscript',
    },
    thumbnail: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'review', 'approved', 'filming', 'completed', 'published'],
      default: 'draft',
    },
    feedback: [ScriptFeedbackSchema],
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// Index for efficient querying by user + status
ScriptSchema.index({ userId: 1, status: 1 });
ScriptSchema.index({ ideaId: 1 });

// Soft delete support
import { applySoftDelete } from '@/lib/soft-delete';
applySoftDelete(ScriptSchema);

const Script: Model<IScript> =
  mongoose.models.Script ||
  mongoose.model<IScript>('Script', ScriptSchema);

export default Script;
