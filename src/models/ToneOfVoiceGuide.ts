import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// --- Tone Parameter Sub-document ---
export type ToneParameterCategory =
  | 'vocabulary'
  | 'sentence_structure'
  | 'emotional_tone'
  | 'rhetorical_patterns'
  | 'phrases_to_avoid'
  | 'personality_markers';

export interface IToneParameter {
  key: string;
  value: string;
  category: ToneParameterCategory;
}

const ToneParameterSchema = new Schema<IToneParameter>(
  {
    key: { type: String, required: true },
    value: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: [
        'vocabulary',
        'sentence_structure',
        'emotional_tone',
        'rhetorical_patterns',
        'phrases_to_avoid',
        'personality_markers',
      ],
    },
  },
  { _id: false }
);

// --- Generated From Sub-document ---
export interface IGeneratedFrom {
  questionnaireId?: Types.ObjectId;
  transcriptIds: Types.ObjectId[];
}

const GeneratedFromSchema = new Schema<IGeneratedFrom>(
  {
    questionnaireId: { type: Schema.Types.ObjectId },
    transcriptIds: [{ type: Schema.Types.ObjectId }],
  },
  { _id: false }
);

// --- Tone of Voice Guide Status ---
export type ToneOfVoiceStatus = 'draft' | 'review' | 'active';

// --- Tone of Voice Guide Document ---
export interface IToneOfVoiceGuide extends Document {
  userId: Types.ObjectId;
  brandBrainId: Types.ObjectId;
  parameters: IToneParameter[];
  status: ToneOfVoiceStatus;
  generatedFrom: IGeneratedFrom;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const ToneOfVoiceGuideSchema = new Schema<IToneOfVoiceGuide>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    brandBrainId: {
      type: Schema.Types.ObjectId,
      ref: 'BrandBrain',
      required: true,
    },
    parameters: [ToneParameterSchema],
    status: {
      type: String,
      enum: ['draft', 'review', 'active'],
      default: 'draft',
    },
    generatedFrom: {
      type: GeneratedFromSchema,
      default: () => ({ transcriptIds: [] }),
    },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

ToneOfVoiceGuideSchema.index({ userId: 1 });
ToneOfVoiceGuideSchema.index({ brandBrainId: 1 });

const ToneOfVoiceGuide: Model<IToneOfVoiceGuide> =
  mongoose.models.ToneOfVoiceGuide ||
  mongoose.model<IToneOfVoiceGuide>('ToneOfVoiceGuide', ToneOfVoiceGuideSchema);

export default ToneOfVoiceGuide;
