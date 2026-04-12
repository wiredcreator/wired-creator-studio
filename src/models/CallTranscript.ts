import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// --- Source & Call Type Enums ---
export type CallTranscriptSource = 'fathom' | 'clickup' | 'manual';
export type CallType = '1on1_coaching' | 'brain_dump' | 'support' | 'other';

// --- Extracted Idea Sub-document ---
export interface IExtractedIdea {
  title: string;
  description: string;
}

const ExtractedIdeaSchema = new Schema<IExtractedIdea>(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
  },
  { _id: false }
);

// --- Extracted Story Sub-document ---
export interface IExtractedStory {
  summary: string;
  fullText: string;
}

const ExtractedStorySchema = new Schema<IExtractedStory>(
  {
    summary: { type: String, required: true },
    fullText: { type: String, default: '' },
  },
  { _id: false }
);

// --- Input Type & Priority ---
export type BrainDumpInputType = 'written' | 'voice' | 'file_upload';
export type BrainDumpPriority = 'high' | 'medium' | 'low';

// --- Call Transcript Document ---
export interface ICallTranscript extends Document {
  userId: Types.ObjectId;
  source: CallTranscriptSource;
  callType: CallType;
  transcript: string;
  extractedIdeas: IExtractedIdea[];
  extractedStories: IExtractedStory[];
  extractedThemes: string[];
  inputType: BrainDumpInputType;
  ingestedIntoBrandBrain: boolean;
  callDate: Date;
  priority: BrainDumpPriority;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CallTranscriptSchema = new Schema<ICallTranscript>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    source: {
      type: String,
      enum: ['fathom', 'clickup', 'manual'],
      required: true,
    },
    callType: {
      type: String,
      enum: ['1on1_coaching', 'brain_dump', 'support', 'other'],
      required: true,
    },
    transcript: { type: String, required: true },
    inputType: {
      type: String,
      enum: ['written', 'voice', 'file_upload'],
      default: 'written',
    },
    extractedIdeas: [ExtractedIdeaSchema],
    extractedStories: [ExtractedStorySchema],
    extractedThemes: [{ type: String }],
    ingestedIntoBrandBrain: { type: Boolean, default: false },
    callDate: { type: Date, required: true },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

CallTranscriptSchema.index({ userId: 1, createdAt: -1 });

const CallTranscript: Model<ICallTranscript> =
  mongoose.models.CallTranscript ||
  mongoose.model<ICallTranscript>('CallTranscript', CallTranscriptSchema);

export default CallTranscript;
