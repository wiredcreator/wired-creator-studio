import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ISavedTag {
  name: string;
  color: string;
}

export interface IUserTagLibrary extends Document {
  userId: Types.ObjectId;
  tags: ISavedTag[];
}

const SavedTagSchema = new Schema<ISavedTag>(
  {
    name: { type: String, required: true },
    color: { type: String, required: true },
  },
  { _id: false }
);

const UserTagLibrarySchema = new Schema<IUserTagLibrary>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  tags: [SavedTagSchema],
});

UserTagLibrarySchema.index({ userId: 1 });

const UserTagLibrary: Model<IUserTagLibrary> =
  mongoose.models.UserTagLibrary ||
  mongoose.model<IUserTagLibrary>('UserTagLibrary', UserTagLibrarySchema);

export default UserTagLibrary;
