import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// --- Type Enum ---
export type SideQuestType = 'voice_storm_prompt' | 'research_task' | 'content_exercise';

// --- Side Quest Document ---
export interface ISideQuest extends Document {
  userId: Types.ObjectId;
  title: string;
  description: string;
  type: SideQuestType;
  prompt: string;
  response?: string;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SideQuestSchema = new Schema<ISideQuest>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['voice_storm_prompt', 'research_task', 'content_exercise'],
      required: true,
    },
    prompt: { type: String, required: true },
    response: { type: String },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Index for efficient querying by user + completion status
SideQuestSchema.index({ userId: 1, completed: 1 });

const SideQuest: Model<ISideQuest> =
  mongoose.models.SideQuest ||
  mongoose.model<ISideQuest>('SideQuest', SideQuestSchema);

export default SideQuest;
