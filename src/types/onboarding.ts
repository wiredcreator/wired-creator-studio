// Types for the Content DNA Questionnaire

export interface InspirationEntry {
  url: string;
  note: string;
}

export interface ContentDNAFormData {
  // Step 1: Identity
  name: string;
  background: string;
  neurodivergentProfile: string[];

  // Step 2: Vision
  contentGoals: string;
  twelveWeekVision: string;

  // Step 3: Audience
  idealViewer: string;
  problemsSolved: string;

  // Step 4: Niche
  industry: string;
  keyTopics: string[];

  // Step 5: Inspiration
  inspirations: InspirationEntry[];

  // Step 6: Voice Samples
  voiceSamples: string[];
  noExistingContent: boolean;
}

export const INITIAL_FORM_DATA: ContentDNAFormData = {
  name: '',
  background: '',
  neurodivergentProfile: [],
  contentGoals: '',
  twelveWeekVision: '',
  idealViewer: '',
  problemsSolved: '',
  industry: '',
  keyTopics: [],
  inspirations: [{ url: '', note: '' }],
  voiceSamples: [''],
  noExistingContent: false,
};

export const STEP_LABELS = [
  'Identity',
  'Vision',
  'Audience',
  'Niche',
  'Inspiration',
  'Your Voice',
  'Review',
] as const;

export const NEURODIVERGENT_OPTIONS = [
  'ADHD',
  'Autism',
  'Dyslexia',
  'Other',
  'Prefer not to say',
] as const;
