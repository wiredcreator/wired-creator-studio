import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BugStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface IBugReport extends Document {
  userId: Types.ObjectId;
  userName: string;
  userEmail: string;
  title: string;
  description: string;
  pageUrl: string;
  severity: BugSeverity;
  status: BugStatus;
  createdAt: Date;
  updatedAt: Date;
}

const BugReportSchema = new Schema<IBugReport>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
    pageUrl: { type: String, default: '' },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
  },
  { timestamps: true }
);

BugReportSchema.index({ userId: 1, createdAt: -1 });
BugReportSchema.index({ status: 1, severity: 1 });

const BugReport: Model<IBugReport> =
  mongoose.models.BugReport ||
  mongoose.model<IBugReport>('BugReport', BugReportSchema);

export default BugReport;
