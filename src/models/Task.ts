import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type TaskType =
  | 'watch_module'
  | 'voice_storm'
  | 'submit_content'
  | 'film_video'
  | 'side_quest'
  | 'review_script'
  | 'custom';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface ITaskComment {
  userId: Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface ITask extends Document {
  userId: Types.ObjectId;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  dueDate: Date;
  completedAt?: Date;
  assignedBy: Types.ObjectId;
  comments: ITaskComment[];
  linkedContentId?: Types.ObjectId;
  embeddedVideoUrl?: string;
  weekNumber: number;
  dayOfWeek: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const TaskCommentSchema = new Schema<ITaskComment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const TaskSchema = new Schema<ITask>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
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
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'skipped'],
      default: 'pending',
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      index: true,
    },
    completedAt: {
      type: Date,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned by is required'],
    },
    comments: {
      type: [TaskCommentSchema],
      default: [],
    },
    linkedContentId: {
      type: Schema.Types.ObjectId,
    },
    embeddedVideoUrl: {
      type: String,
      trim: true,
    },
    weekNumber: {
      type: Number,
      required: [true, 'Week number is required'],
      min: 1,
      max: 12,
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
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient daily task queries
TaskSchema.index({ userId: 1, dueDate: 1, order: 1 });
TaskSchema.index({ userId: 1, weekNumber: 1 });

// Prevent model recompilation in development (Next.js hot reload)
const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

export default Task;
