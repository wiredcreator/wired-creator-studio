import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IXPHistoryEntry {
  action: string;
  points: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface IUserXP extends Document {
  userId: mongoose.Types.ObjectId;
  lifetimeXP: number;
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: Date | null;
  xpHistory: IXPHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const XPHistoryEntrySchema = new Schema<IXPHistoryEntry>(
  {
    action: { type: String, required: true },
    points: { type: Number, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const UserXPSchema = new Schema<IUserXP>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    lifetimeXP: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: null },
    xpHistory: [XPHistoryEntrySchema],
  },
  { timestamps: true }
);

UserXPSchema.index({ userId: 1 }, { unique: true });

const UserXP: Model<IUserXP> =
  mongoose.models.UserXP || mongoose.model<IUserXP>('UserXP', UserXPSchema);

export default UserXP;
