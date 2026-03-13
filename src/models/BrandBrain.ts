import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// --- Content Pillar Sub-document ---
export interface IContentPillar {
  title: string;
  description: string;
  keywords: string[];
}

const ContentPillarSchema = new Schema<IContentPillar>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    keywords: [{ type: String }],
  },
  { _id: false }
);

// --- Industry Data Sub-document ---
export interface IIndustryData {
  field: string;
  keywords: string[];
  competitors: string[];
}

const IndustryDataSchema = new Schema<IIndustryData>(
  {
    field: { type: String, default: '' },
    keywords: [{ type: String }],
    competitors: [{ type: String }],
  },
  { _id: false }
);

// --- Equipment Profile Sub-document ---
export interface IEquipmentProfile {
  camera: string;
  location: string;
  constraints: string;
}

const EquipmentProfileSchema = new Schema<IEquipmentProfile>(
  {
    camera: { type: String, default: '' },
    location: { type: String, default: '' },
    constraints: { type: String, default: '' },
  },
  { _id: false }
);

// --- Brand Brain Version Snapshot ---
export interface IBrandBrainSnapshot {
  version: number;
  snapshotDate: Date;
  toneOfVoiceGuide?: Types.ObjectId;
  contentPillars: IContentPillar[];
  industryData: IIndustryData;
  equipmentProfile: IEquipmentProfile;
}

const BrandBrainSnapshotSchema = new Schema<IBrandBrainSnapshot>(
  {
    version: { type: Number, required: true },
    snapshotDate: { type: Date, default: Date.now },
    toneOfVoiceGuide: { type: Schema.Types.ObjectId, ref: 'ToneOfVoiceGuide' },
    contentPillars: [ContentPillarSchema],
    industryData: IndustryDataSchema,
    equipmentProfile: EquipmentProfileSchema,
  },
  { _id: false }
);

// --- Brand Brain Document ---
export interface IBrandBrain extends Document {
  userId: Types.ObjectId;
  toneOfVoiceGuide?: Types.ObjectId;
  contentPillars: IContentPillar[];
  industryData: IIndustryData;
  equipmentProfile: IEquipmentProfile;
  version: number;
  previousVersions: IBrandBrainSnapshot[];
  createdAt: Date;
  updatedAt: Date;
}

const BrandBrainSchema = new Schema<IBrandBrain>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    toneOfVoiceGuide: {
      type: Schema.Types.ObjectId,
      ref: 'ToneOfVoiceGuide',
    },
    contentPillars: [ContentPillarSchema],
    industryData: {
      type: IndustryDataSchema,
      default: () => ({}),
    },
    equipmentProfile: {
      type: EquipmentProfileSchema,
      default: () => ({}),
    },
    version: { type: Number, default: 1 },
    previousVersions: [BrandBrainSnapshotSchema],
  },
  { timestamps: true }
);

// Auto-increment version on save
// @ts-expect-error - Mongoose types require @types/mongoose to be installed
BrandBrainSchema.pre('save', function (next: () => void) {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
  }
  next();
});

const BrandBrain: Model<IBrandBrain> =
  mongoose.models.BrandBrain ||
  mongoose.model<IBrandBrain>('BrandBrain', BrandBrainSchema);

export default BrandBrain;
