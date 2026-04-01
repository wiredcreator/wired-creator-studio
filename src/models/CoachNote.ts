import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICoachNote extends Document {
  studentId: Types.ObjectId;
  authorId: Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const CoachNoteSchema = new Schema<ICoachNote>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'studentId is required'],
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'authorId is required'],
    },
    text: {
      type: String,
      required: [true, 'text is required'],
      trim: true,
    },
  },
  { timestamps: true }
);

CoachNoteSchema.index({ studentId: 1, createdAt: -1 });

const CoachNote: Model<ICoachNote> =
  mongoose.models.CoachNote || mongoose.model<ICoachNote>('CoachNote', CoachNoteSchema);

export default CoachNote;
