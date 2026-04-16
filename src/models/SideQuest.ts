import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// --- Type Enum ---
export type SideQuestType = 'voice_storm_prompt' | 'research_task' | 'content_exercise';
export type SideQuestCategory = 'brand_brain_fuel' | 'scroll_study' | 'hook_gym' | 'record_button_reps';
export type EnergyTier = 'spark' | 'flow' | 'hyperfocus';
export type MotivationDriver = 'captivate' | 'create' | 'compete' | 'complete';
export type ContentTrack = 'both' | 'long_form' | 'short_form';

// --- Side Quest Document ---
export interface ISideQuest extends Document {
  userId: Types.ObjectId;
  title: string;
  description: string;
  type: SideQuestType;
  prompt: string;
  xpReward: number;
  estimatedMinutes: number;
  category: SideQuestCategory;
  energyTier: EnergyTier;
  motivationDriver?: MotivationDriver;
  track: ContentTrack;
  whyThisMatters?: string;
  rescueStatement?: string;
  bonusRound?: string;
  deliverable?: string;
  response?: string;
  completed: boolean;
  completedAt?: Date;
  savedToBrandBrain: boolean;
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
    xpReward: { type: Number, default: 15 },
    estimatedMinutes: { type: Number, default: 10 },
    category: {
      type: String,
      enum: ['brand_brain_fuel', 'scroll_study', 'hook_gym', 'record_button_reps'],
      default: 'brand_brain_fuel',
    },
    energyTier: {
      type: String,
      enum: ['spark', 'flow', 'hyperfocus'],
      default: 'flow',
    },
    motivationDriver: {
      type: String,
      enum: ['captivate', 'create', 'compete', 'complete'],
    },
    track: {
      type: String,
      enum: ['both', 'long_form', 'short_form'],
      default: 'both',
    },
    whyThisMatters: { type: String },
    rescueStatement: { type: String },
    bonusRound: { type: String },
    deliverable: { type: String },
    response: { type: String },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    savedToBrandBrain: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for efficient querying by user + completion status
SideQuestSchema.index({ userId: 1, completed: 1 });
SideQuestSchema.index({ userId: 1, category: 1, createdAt: -1 });

const SideQuest: Model<ISideQuest> =
  mongoose.models.SideQuest ||
  mongoose.model<ISideQuest>('SideQuest', SideQuestSchema);

export default SideQuest;
