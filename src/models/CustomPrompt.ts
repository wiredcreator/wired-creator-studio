import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type CustomPromptCategory =
  | 'script_generation'
  | 'idea_generation'
  | 'side_quest_generation'
  | 'brain_dump_processing'
  | 'tone_of_voice'
  | 'content_pillar_generation'
  | 'personal_baseline_processing';

export interface ICustomPrompt extends Document {
  name: string;
  category: CustomPromptCategory;
  promptText: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CustomPromptSchema = new Schema<ICustomPrompt>(
  {
    name: { type: String, required: true, maxlength: 200 },
    category: {
      type: String,
      enum: [
        'script_generation',
        'idea_generation',
        'side_quest_generation',
        'brain_dump_processing',
        'tone_of_voice',
        'content_pillar_generation',
        'personal_baseline_processing',
      ],
      required: true,
    },
    promptText: { type: String, required: true, maxlength: 10000 },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

CustomPromptSchema.index({ category: 1, isActive: 1 });
CustomPromptSchema.index({ createdBy: 1 });

const CustomPrompt: Model<ICustomPrompt> =
  mongoose.models.CustomPrompt ||
  mongoose.model<ICustomPrompt>('CustomPrompt', CustomPromptSchema);

export default CustomPrompt;
