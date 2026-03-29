import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'student' | 'admin';
  onboardingCompleted: boolean;
  personalBaselineCompleted: boolean;
  background: string;
  neurodivergentProfile: string;
  contentGoals: string;
  timezone: string;
  avatarUrl: string;
  profileImage: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  // Auth security fields
  loginAttempts: number;
  lockUntil?: Date;
  passwordChangedAt?: Date;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  // Methods
  isLocked(): boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    personalBaselineCompleted: {
      type: Boolean,
      default: false,
    },
    background: {
      type: String,
      default: '',
    },
    neurodivergentProfile: {
      type: String,
      default: '',
    },
    contentGoals: {
      type: String,
      default: '',
    },
    timezone: {
      type: String,
      default: 'America/New_York',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    profileImage: {
      type: String,
      default: '',
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
    },
    emailVerificationExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// Prevent model recompilation in development (Next.js hot reload)
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
