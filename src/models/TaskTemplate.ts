import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import type { TaskType } from './Task';

export interface ITaskTemplate extends Document {
  weekNumber: number;
  title: string;
  description: string;
  type: TaskType;
  dayOfWeek: number;
  order: number;
  embeddedVideoUrl?: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskTemplateSchema = new Schema<ITaskTemplate>(
  {
    weekNumber: {
      type: Number,
      required: [true, 'Week number is required'],
      min: 1,
      max: 16,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['watch_module', 'voice_storm', 'submit_content', 'film_video', 'side_quest', 'review_script', 'custom'],
      required: [true, 'Task type is required'],
    },
    dayOfWeek: {
      type: Number,
      required: [true, 'Day of week is required'],
      min: 0,
      max: 6,
    },
    order: {
      type: Number,
      default: 0,
    },
    embeddedVideoUrl: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
  },
  {
    timestamps: true,
  }
);

TaskTemplateSchema.index({ weekNumber: 1, isActive: 1, order: 1 });

const TaskTemplate: Model<ITaskTemplate> =
  mongoose.models.TaskTemplate || mongoose.model<ITaskTemplate>('TaskTemplate', TaskTemplateSchema);

export default TaskTemplate;
