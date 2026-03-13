import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// --- Answer Type ---
export type AnswerType = 'text' | 'url' | 'multiselect';

// --- Questionnaire Answer Sub-document ---
export interface IQuestionnaireAnswer {
  questionId: string;
  question: string;
  answer: string | string[];
  answerType: AnswerType;
}

const QuestionnaireAnswerSchema = new Schema<IQuestionnaireAnswer>(
  {
    questionId: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: Schema.Types.Mixed, required: true },
    answerType: {
      type: String,
      enum: ['text', 'url', 'multiselect'],
      required: true,
    },
  },
  { _id: false }
);

// --- Creator Example Sub-document ---
export interface ICreatorExample {
  url: string;
  platform: string;
  extractedTranscript: string;
}

const CreatorExampleSchema = new Schema<ICreatorExample>(
  {
    url: { type: String, required: true },
    platform: { type: String, required: true },
    extractedTranscript: { type: String, default: '' },
  },
  { _id: false }
);

// --- Content Sample Sub-document ---
export interface IContentSample {
  text: string;
  type: string;
}

const ContentSampleSchema = new Schema<IContentSample>(
  {
    text: { type: String, required: true },
    type: { type: String, required: true },
  },
  { _id: false }
);

// --- Content DNA Response Document ---
export interface IContentDNAResponse extends Document {
  userId: Types.ObjectId;
  responses: IQuestionnaireAnswer[];
  creatorExamples: ICreatorExample[];
  contentSamples: IContentSample[];
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContentDNAResponseSchema = new Schema<IContentDNAResponse>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    responses: [QuestionnaireAnswerSchema],
    creatorExamples: [CreatorExampleSchema],
    contentSamples: [ContentSampleSchema],
    completedAt: { type: Date },
  },
  { timestamps: true }
);

const ContentDNAResponse: Model<IContentDNAResponse> =
  mongoose.models.ContentDNAResponse ||
  mongoose.model<IContentDNAResponse>('ContentDNAResponse', ContentDNAResponseSchema);

export default ContentDNAResponse;
