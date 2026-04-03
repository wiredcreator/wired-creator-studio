import { getAnthropicClient, CLAUDE_MODEL } from './client';
import { trackAIUsage } from './usage-tracker';
import dbConnect from '@/lib/db';
import AIDocument from '@/models/AIDocument';
import BrandBrain from '@/models/BrandBrain';
import ContentDNAResponse from '@/models/ContentDNAResponse';
import PersonalBaseline from '@/models/PersonalBaseline';

// ---------------------------------------------------------------------------
// Variable mappings
// ---------------------------------------------------------------------------

// Content DNA: {{C1}} - {{C16}}
const CONTENT_DNA_VARIABLE_MAP: Record<string, string> = {
  C1: 'yourStory',
  C2: 'winsAndMilestones',
  C3: 'contentGoal',
  C4: 'offerAndContent',
  C5: 'goToPersonFor',
  C6: 'talkWithoutPreparing',
  C7: 'audienceAndProblem',
  C8: 'uniquePerspective',
  C9: 'personalStories',
  C10: 'knownForAndAgainst',
  C11: 'contentHistory',
  C12: 'timeAndEnergy',
  C13: 'easyVsDraining',
  C14: 'naturalFormat',
  C15: 'coreMessage',
  C16: 'writtenSamples',
};

// Personal Baseline: {{P1}} - {{P17}}
const PERSONAL_BASELINE_VARIABLE_MAP: Record<string, string> = {
  P1: 'location-city',
  P2: 'location-state',
  P3: 'typical-day',
  P4: 'fixed-commitments',
  P5: 'consistency-blockers',
  P6: 'stuck-response',
  P7: 'adhd-management',
  P8: 'past-systems',
  P9: 'existing-habits',
  P10: 'motivation-rewards',
  P11: 'physical-space',
  P12: 'phone-relationship',
  P13: 'sleep-energy',
  P14: 'accountability-person',
  P15: 'upcoming-disruptions',
  P16: 'success-definition',
  P17: 'anything-else',
};

// ---------------------------------------------------------------------------
// compileStudentProfile
// ---------------------------------------------------------------------------

export interface CompileStudentProfileResult {
  success: true;
  compiledAt: Date;
}

export interface CompileStudentProfileError {
  success: false;
  error: string;
}

/**
 * Compiles a student coaching profile by populating the global student_profile
 * AI Document template with the student's actual questionnaire answers, then
 * calling Claude to produce a structured profile narrative.
 *
 * The result is stored in BrandBrain.compiledProfile.
 */
export async function compileStudentProfile(
  userId: string
): Promise<CompileStudentProfileResult | CompileStudentProfileError> {
  await dbConnect();

  // --- 1. Fetch the global student_profile template ---
  const templateDoc = await AIDocument.findOne({
    category: 'student_profile',
    scope: 'global',
  }).lean();

  if (!templateDoc) {
    return { success: false, error: 'No student profile template found' };
  }

  // --- 2. Fetch questionnaire data ---
  const [contentDNA, personalBaseline] = await Promise.all([
    ContentDNAResponse.findOne({ userId }).lean(),
    PersonalBaseline.findOne({ userId }).lean(),
  ]);

  // --- 3. Build variable lookup maps from responses ---

  // Content DNA: answer can be string | string[]
  const contentDNAAnswers: Record<string, string> = {};
  if (contentDNA?.responses) {
    for (const r of contentDNA.responses) {
      const answer = Array.isArray(r.answer) ? r.answer.join('\n') : r.answer;
      contentDNAAnswers[r.questionId] = answer;
    }
  }

  // Personal Baseline: answer is always a plain string
  const personalBaselineAnswers: Record<string, string> = {};
  if (personalBaseline?.responses) {
    for (const r of personalBaseline.responses) {
      personalBaselineAnswers[r.questionId] = r.answer;
    }
  }

  // --- 4. Replace template variables with actual answers ---
  let populatedTemplate = templateDoc.content;

  // Replace Content DNA variables {{C1}} - {{C16}}
  for (const [variable, questionId] of Object.entries(CONTENT_DNA_VARIABLE_MAP)) {
    const answer = contentDNAAnswers[questionId] ?? '(not provided)';
    populatedTemplate = populatedTemplate.replaceAll(`{{${variable}}}`, answer);
  }

  // Replace Personal Baseline variables {{P1}} - {{P17}}
  for (const [variable, questionId] of Object.entries(PERSONAL_BASELINE_VARIABLE_MAP)) {
    const answer = personalBaselineAnswers[questionId] ?? '(not provided)';
    populatedTemplate = populatedTemplate.replaceAll(`{{${variable}}}`, answer);
  }

  // --- 5. Call Claude with the populated template ---
  const client = getAnthropicClient();
  const startMs = Date.now();

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system:
      'You are generating a structured student coaching profile. Follow the instructions in the template exactly. Output only the completed profile.',
    messages: [{ role: 'user', content: populatedTemplate }],
  });

  trackAIUsage({ userId, feature: 'student_profile_compile', response, durationMs: Date.now() - startMs });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    return { success: false, error: 'Claude returned an unexpected response format' };
  }

  // --- 6. Store the compiled profile in BrandBrain ---
  const compiledAt = new Date();

  await BrandBrain.findOneAndUpdate(
    { userId },
    {
      $set: {
        'compiledProfile.content': textBlock.text,
        'compiledProfile.templateUpdatedAt': templateDoc.updatedAt,
        'compiledProfile.compiledAt': compiledAt,
      },
    }
  );

  return { success: true, compiledAt };
}
