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
  equipmentChecklist?: IEquipmentChecklistItem[];
  voiceStormSessions?: Types.ObjectId[];
  callTranscripts?: Types.ObjectId[];
  approvedIdeas?: Types.ObjectId[];
  contentDNAResponse?: Types.ObjectId;
}

const BrandBrainSnapshotSchema = new Schema<IBrandBrainSnapshot>(
  {
    version: { type: Number, required: true },
    snapshotDate: { type: Date, default: Date.now },
    toneOfVoiceGuide: { type: Schema.Types.ObjectId, ref: 'ToneOfVoiceGuide' },
    contentPillars: [ContentPillarSchema],
    industryData: IndustryDataSchema,
    equipmentProfile: EquipmentProfileSchema,
    voiceStormSessions: [{ type: Schema.Types.ObjectId, ref: 'VoiceStormingTranscript' }],
    callTranscripts: [{ type: Schema.Types.ObjectId, ref: 'CallTranscript' }],
    approvedIdeas: [{ type: Schema.Types.ObjectId, ref: 'ContentIdea' }],
    contentDNAResponse: { type: Schema.Types.ObjectId, ref: 'ContentDNAResponse' },
  },
  { _id: false }
);

// --- Equipment Checklist Item Sub-document ---
export interface IEquipmentChecklistItem {
  label: string;
  checked: boolean;
}

const EquipmentChecklistItemSchema = new Schema<IEquipmentChecklistItem>(
  {
    label: { type: String, required: true },
    checked: { type: Boolean, default: false },
  },
  { _id: false }
);

// --- Side Quest Insight Sub-document ---
export interface ISideQuestInsight {
  questTitle: string;
  questType: string;
  response: string;
  savedAt: Date;
}

const SideQuestInsightSchema = new Schema<ISideQuestInsight>(
  {
    questTitle: { type: String, required: true },
    questType: { type: String, required: true },
    response: { type: String, required: true },
    savedAt: { type: Date, default: Date.now },
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
  equipmentChecklist: IEquipmentChecklistItem[];
  voiceStormSessions: Types.ObjectId[];
  callTranscripts: Types.ObjectId[];
  approvedIdeas: Types.ObjectId[];
  contentDNAResponse?: Types.ObjectId;
  sideQuestInsights: ISideQuestInsight[];
  compiledProfile: {
    content: string;
    templateUpdatedAt?: Date;
    compiledAt?: Date;
  };
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
    equipmentChecklist: {
      type: [EquipmentChecklistItemSchema],
      default: [],
    },
    voiceStormSessions: [
      { type: Schema.Types.ObjectId, ref: 'VoiceStormingTranscript' },
    ],
    callTranscripts: [
      { type: Schema.Types.ObjectId, ref: 'CallTranscript' },
    ],
    approvedIdeas: [
      { type: Schema.Types.ObjectId, ref: 'ContentIdea' },
    ],
    contentDNAResponse: {
      type: Schema.Types.ObjectId,
      ref: 'ContentDNAResponse',
    },
    sideQuestInsights: [SideQuestInsightSchema],
    compiledProfile: {
      content: { type: String, default: '' },
      templateUpdatedAt: { type: Date },
      compiledAt: { type: Date },
    },
    version: { type: Number, default: 1 },
    previousVersions: [BrandBrainSnapshotSchema],
  },
  { timestamps: true }
);

// Auto-increment version on save
BrandBrainSchema.pre('save', function () {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
  }
  const MAX_VERSION_SNAPSHOTS = 50;
  if (this.previousVersions && this.previousVersions.length > MAX_VERSION_SNAPSHOTS) {
    this.previousVersions = this.previousVersions.slice(-MAX_VERSION_SNAPSHOTS);
  }
});

const BrandBrain: Model<IBrandBrain> =
  mongoose.models.BrandBrain ||
  mongoose.model<IBrandBrain>('BrandBrain', BrandBrainSchema);

export default BrandBrain;
