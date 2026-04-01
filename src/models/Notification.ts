import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: 'task_assigned' | 'comment_reply' | 'quest_available' | 'xp_earned' | 'system' | 'task_stuck' | 'extension_request' | 'coach_message';
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  read: boolean;
  retrieved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['task_assigned', 'comment_reply', 'quest_available', 'xp_earned', 'system', 'task_stuck', 'extension_request', 'coach_message'],
      required: [true, 'type is required'],
    },
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'message is required'],
      trim: true,
    },
    relatedId: {
      type: String,
      default: undefined,
    },
    relatedType: {
      type: String,
      default: undefined,
    },
    read: {
      type: Boolean,
      default: false,
    },
    retrieved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries: get unretrieved notifications for a user, sorted by date
NotificationSchema.index({ userId: 1, retrieved: 1, createdAt: -1 });

// Prevent model recompilation in development (Next.js hot reload)
const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
