import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// --- Session Type ---
export type VoiceStormingSessionType = 'freeform' | 'guided' | 'idea_specific';

// --- Extracted Insight Sub-document ---
export type InsightType = 'idea' | 'story' | 'action_item' | 'theme';

export interface IExtractedInsight {
  _id?: Types.ObjectId;
  type: InsightType;
  content: string;
  contentPillar: string;
}

const ExtractedInsightSchema = new Schema<IExtractedInsight>({
  type: {
    type: String,
    enum: ['idea', 'story', 'action_item', 'theme'],
    required: true,
  },
  content: { type: String, required: true },
  contentPillar: { type: String, default: '' },
});

// --- Voice Storming Transcript Document ---
export interface IVoiceStormingTranscript extends Document {
  userId: Types.ObjectId;
  linkedIdeaIds?: Types.ObjectId[];
  audioUrl?: string;
  transcript: string;
  title?: string;
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
    linkedIdeaIds: [{ type: Schema.Types.ObjectId, ref: 'ContentIdea' }],
    audioUrl: { type: String },
    transcript: { type: String, required: true },
    title: { type: String },
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

VoiceStormingTranscriptSchema.index({ userId: 1, createdAt: -1 });

const VoiceStormingTranscript: Model<IVoiceStormingTranscript> =
  mongoose.models.VoiceStormingTranscript ||
  mongoose.model<IVoiceStormingTranscript>(
    'VoiceStormingTranscript',
    VoiceStormingTranscriptSchema
  );

export default VoiceStormingTranscript;
