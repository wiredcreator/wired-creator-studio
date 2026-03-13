import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// --- Session Type ---
export type VoiceStormingSessionType = 'freeform' | 'guided' | 'idea_specific';

// --- Extracted Insight Sub-document ---
export type InsightType = 'idea' | 'story' | 'insight' | 'theme';

export interface IExtractedInsight {
  type: InsightType;
  content: string;
  contentPillar: string;
}

const ExtractedInsightSchema = new Schema<IExtractedInsight>(
  {
    type: {
      type: String,
      enum: ['idea', 'story', 'insight', 'theme'],
      required: true,
    },
    content: { type: String, required: true },
    contentPillar: { type: String, default: '' },
  },
  { _id: false }
);

// --- Voice Storming Transcript Document ---
export interface IVoiceStormingTranscript extends Document {
  userId: Types.ObjectId;
  linkedIdeaId?: Types.ObjectId;
  audioUrl?: string;
  transcript: string;
  extractedInsights: IExtractedInsight[];
  sessionType: VoiceStormingSessionType;
  promptUsed?: string;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

const VoiceStormingTranscriptSchema = new Schema<IVoiceStormingTranscript>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    linkedIdeaId: {
      type: Schema.Types.ObjectId,
      ref: 'ContentIdea',
    },
    audioUrl: { type: String },
    transcript: { type: String, required: true },
    extractedInsights: [ExtractedInsightSchema],
    sessionType: {
      type: String,
      enum: ['freeform', 'guided', 'idea_specific'],
      default: 'freeform',
    },
    promptUsed: { type: String },
    duration: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const VoiceStormingTranscript: Model<IVoiceStormingTranscript> =
  mongoose.models.VoiceStormingTranscript ||
  mongoose.model<IVoiceStormingTranscript>(
    'VoiceStormingTranscript',
    VoiceStormingTranscriptSchema
  );

export default VoiceStormingTranscript;
