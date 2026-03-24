import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// --- Personal Baseline Answer Sub-document ---
export interface IPersonalBaselineAnswer {
  questionId: string;
  question: string;
  answer: string;
}

const PersonalBaselineAnswerSchema = new Schema<IPersonalBaselineAnswer>(
  {
    questionId: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false }
);

// --- Personal Baseline Response Document ---
export interface IPersonalBaseline extends Document {
  userId: Types.ObjectId;
  responses: IPersonalBaselineAnswer[];
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PersonalBaselineSchema = new Schema<IPersonalBaseline>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    responses: [PersonalBaselineAnswerSchema],
    completedAt: { type: Date },
  },
  { timestamps: true }
);

PersonalBaselineSchema.index({ userId: 1 });

const PersonalBaseline: Model<IPersonalBaseline> =
  mongoose.models.PersonalBaseline ||
  mongoose.model<IPersonalBaseline>('PersonalBaseline', PersonalBaselineSchema);

export default PersonalBaseline;
