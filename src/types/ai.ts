// ---------------------------------------------------------------------------
// AI Types — shared across all AI generation features
// ---------------------------------------------------------------------------

/** Categories that a Tone of Voice parameter can belong to. */
export type ToneParameterCategory =
  | 'vocabulary'
  | 'sentence_structure'
  | 'emotional_tone'
  | 'rhetorical_patterns'
  | 'phrases_to_avoid'
  | 'personality_markers';

/** A single parameter within the Tone of Voice guide. */
export interface ToneOfVoiceParameter {
  key: string;
  value: string;
  category: ToneParameterCategory;
}

/** The structured output returned by the Tone of Voice generator. */
export interface ToneOfVoiceGuideOutput {
  parameters: ToneOfVoiceParameter[];
  summary: string;
  generatedAt: Date;
}

/** A content idea produced by the AI idea engine. */
export interface GeneratedIdea {
  title: string;
  description: string;
  contentPillar: string;
  angle: string;
}

/** A fully-generated script including teleprompter and bullet-point variants. */
export interface GeneratedScript {
  title: string;
  fullScript: string;
  bulletPoints: string[];
  teleprompterVersion: string;
}

// ---------------------------------------------------------------------------
// Brain Dump Processing
// ---------------------------------------------------------------------------

/** A content idea extracted from a brain dump transcript. */
export interface BrainDumpContentIdea {
  title: string;
  description: string;
  contentPillar: string;
  angle: string;
}

/** A personal story or anecdote extracted from a brain dump transcript. */
export interface BrainDumpStory {
  summary: string;
  fullText: string;
}

/** An industry insight extracted from a brain dump transcript. */
export interface BrainDumpInsight {
  content: string;
  tags: string[];
}

/** A recurring theme extracted from a brain dump transcript. */
export interface BrainDumpTheme {
  theme: string;
  contentPillar: string;
  occurrences: number;
}

/** The structured output returned by the brain dump processor. */
export interface BrainDumpOutput {
  contentIdeas: BrainDumpContentIdea[];
  stories: BrainDumpStory[];
  insights: BrainDumpInsight[];
  themes: BrainDumpTheme[];
}

// ---------------------------------------------------------------------------
// Request / Response helpers for API routes
// ---------------------------------------------------------------------------

/** Body shape for POST /api/ai/tone-of-voice */
export interface ToneOfVoiceRequest {
  /** Mongo ObjectId of the ContentDNAResponse document (preferred). */
  contentDNAResponseId?: string;
  /** Raw questionnaire answers — used when no persisted document exists yet. */
  rawResponses?: {
    questionId: string;
    question: string;
    answer: string | string[];
    answerType: 'text' | 'url' | 'multiselect';
  }[];
  /** Raw content samples provided by the student. */
  contentSamples?: {
    text: string;
    type: string;
  }[];
  /** Creator example URLs and any extracted transcripts. */
  creatorExamples?: {
    url: string;
    platform: string;
    extractedTranscript: string;
  }[];
  /** Optional additional transcript text (e.g. from YouTube / Fathom). */
  transcripts?: string[];
  /** The user's Brand Brain ID — used to link the generated guide. */
  brandBrainId?: string;
}

/** Successful response from POST /api/ai/tone-of-voice */
export interface ToneOfVoiceResponse {
  success: true;
  guide: ToneOfVoiceGuideOutput;
}

/** Error response from any AI API route */
export interface AIErrorResponse {
  success: false;
  error: string;
  code?: string;
}

// ---------------------------------------------------------------------------
// Side Quest Generation
// ---------------------------------------------------------------------------

/** A single side quest produced by the AI generator. */
export interface GeneratedSideQuest {
  title: string;
  description: string;
  type: 'voice_storm_prompt' | 'research_task' | 'content_exercise';
  prompt: string;
  xpReward: number;
  estimatedMinutes: number;
}

// ---------------------------------------------------------------------------
// Brand Brain context assembly options
// ---------------------------------------------------------------------------

/** Controls which slices of the Brand Brain are included in the AI prompt. */
export interface BrandBrainContextOptions {
  includeToneOfVoice?: boolean;
  includeContentPillars?: boolean;
  includeIndustryData?: boolean;
  includeEquipmentProfile?: boolean;
  includeTranscripts?: boolean;
  /** Max number of recent transcripts to include (default 3). */
  maxTranscripts?: number;
  includeApprovedIdeas?: boolean;
  includeContentDNA?: boolean;
  maxApprovedIdeas?: number;
  includeSideQuestInsights?: boolean;
}
