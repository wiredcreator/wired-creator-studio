// Types for the Content DNA Questionnaire

export interface InspirationEntry {
  url: string;
  note: string;
  transcript?: string;
  videoTitle?: string;
}

export interface ContentDNAFormData {
  // Step 1: Your Story (Q1-Q3)
  yourStory: string;
  winsAndMilestones: string;
  contentGoal: string;

  // Step 2: Your Business (Q4-Q5)
  offerAndContent: string;
  goToPersonFor: string;

  // Step 3: Your Passion (Q6-Q8)
  talkWithoutPreparing: string;
  audienceAndProblem: string;
  uniquePerspective: string;

  // Step 4: Your Stories (Q9-Q10)
  personalStories: string;
  knownForAndAgainst: string;

  // Step 5: Your History (Q11-Q13 + optional written samples)
  contentHistory: string;
  timeAndEnergy: string;
  easyVsDraining: string;
  writtenSamples: string;

  // Step 6: Your Inspiration (Q14-Q15)
  inspirations: InspirationEntry[];
  naturalFormat: string;

  // Step 7: Your Core Message (Q16)
  coreMessage: string;
}

export const INITIAL_FORM_DATA: ContentDNAFormData = {
  yourStory: '',
  winsAndMilestones: '',
  contentGoal: '',
  offerAndContent: '',
  goToPersonFor: '',
  talkWithoutPreparing: '',
  audienceAndProblem: '',
  uniquePerspective: '',
  personalStories: '',
  knownForAndAgainst: '',
  contentHistory: '',
  timeAndEnergy: '',
  easyVsDraining: '',
  writtenSamples: '',
  inspirations: [{ url: '', note: '' }],
  naturalFormat: '',
  coreMessage: '',
};

export const STEP_LABELS = [
  'Your Story',          // Q1: yourStory
  'Wins & Milestones',   // Q2: winsAndMilestones
  'Content Goal',        // Q3: contentGoal
  'Your Offer',          // Q4: offerAndContent
  'Go-To Person',        // Q5: goToPersonFor
  'Your Fire Topics',    // Q6: talkWithoutPreparing
  'Your Audience',       // Q7: audienceAndProblem
  'Your Perspective',    // Q8: uniquePerspective
  'Your Stories',        // Q9: personalStories
  'Known For & Against', // Q10: knownForAndAgainst
  'Content History',     // Q11: contentHistory
  'Time & Energy',       // Q12: timeAndEnergy
  'Easy vs. Draining',   // Q13: easyVsDraining
  'Writing Samples',     // Q14: writtenSamples (optional)
  'Your Inspiration',    // Q15: inspirations + naturalFormat
  'Your Core Message',   // Q16: coreMessage
  'Review',
] as const;
