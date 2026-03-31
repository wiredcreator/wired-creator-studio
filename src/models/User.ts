import mongoose, { Schema, Document, Model } from 'mongoose';

export type SubscriptionTier = 'accelerator' | 'full_program' | 'monthly' | 'trial' | 'none';
export type AccessStatus = 'active' | 'past_due' | 'canceled' | 'expired' | 'none';

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
  riskFlags: string[];
  city: string;
  state: string;
  timezone: string;
  avatarUrl: string;
  profileImage: string;
  magicLinkToken?: string;
  magicLinkExpires?: Date;
  stripeCustomerId: string;
  subscriptionTier: SubscriptionTier;
  accessStatus: AccessStatus;
  accessExpiresAt: Date | null;
  stripeSubscriptionId: string;
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
      required: false,
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
    riskFlags: {
      type: [String],
      default: [],
    },
    city: {
      type: String,
      default: '',
    },
    state: {
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
    magicLinkToken: { type: String, default: null },
    magicLinkExpires: { type: Date, default: null },
    stripeCustomerId: { type: String, default: '' },
    subscriptionTier: {
      type: String,
      enum: ['accelerator', 'full_program', 'monthly', 'trial', 'none'],
      default: 'none',
    },
    accessStatus: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'expired', 'none'],
      default: 'none',
    },
    accessExpiresAt: { type: Date, default: null },
    stripeSubscriptionId: { type: String, default: '' },
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
