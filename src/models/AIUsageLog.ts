import mongoose, { Schema, Model, Types } from 'mongoose';

export interface IAIUsageLog {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  feature: string;
  aiModel: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  success: boolean;
  errorMessage?: string;
  durationMs?: number;
  createdAt: Date;
  updatedAt: Date;
}

const AIUsageLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    feature: {
      type: String,
      required: true,
      enum: [
        'tone_of_voice',
        'brain_dump',
        'idea_generation',
        'script_generation',
        'voice_storming',
        'session_title',
        'side_quests',
        'content_scout_discover',
        'content_scout_scrape',
        'content_scout_ideas',
        'voice_storming_prompts',
        'idea_concept',
        'idea_alternative_titles',
        'idea_outline',
      ],
    },
    aiModel: { type: String, required: true },
    inputTokens: { type: Number, required: true, default: 0 },
    outputTokens: { type: Number, required: true, default: 0 },
    totalTokens: { type: Number, required: true, default: 0 },
    estimatedCostUsd: { type: Number, required: true, default: 0 },
    success: { type: Boolean, required: true, default: true },
    errorMessage: { type: String },
    durationMs: { type: Number },
  },
  { timestamps: true }
);

AIUsageLogSchema.index({ userId: 1, createdAt: -1 });
AIUsageLogSchema.index({ feature: 1, createdAt: -1 });
AIUsageLogSchema.index({ createdAt: -1 });

const AIUsageLog: Model<IAIUsageLog> =
  mongoose.models.AIUsageLog ||
  mongoose.model<IAIUsageLog>('AIUsageLog', AIUsageLogSchema);

export default AIUsageLog;
