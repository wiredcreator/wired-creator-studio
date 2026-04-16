import { getAnthropicClient, CLAUDE_MODEL, extractJsonFromResponse } from './client';
import { withRetry } from '@/lib/retry';
import { trackAIUsage } from './usage-tracker';
import type { AIFeature } from './usage-tracker';
import {
  TONE_OF_VOICE_SYSTEM_PROMPT,
  BRAIN_DUMP_PROCESSING_PROMPT,
  IDEA_GENERATION_SYSTEM_PROMPT,
  SCRIPT_GENERATION_SYSTEM_PROMPT,
  VOICE_STORMING_PROCESSING_PROMPT,
  SIDE_QUEST_GENERATION_PROMPT,
  CONTENT_PILLAR_GENERATION_PROMPT,
  PERSONAL_BASELINE_PROCESSING_PROMPT,
} from './prompts';
import type {
  ToneOfVoiceGuideOutput,
  ToneOfVoiceParameter,
  GeneratedIdea,
  GeneratedScript,
  BrainDumpOutput,
  GeneratedSideQuest,
} from '@/types/ai';
import dbConnect from '@/lib/db';
import AIDocument from '@/models/AIDocument';
import type { AIDocumentCategory } from '@/models/AIDocument';
import BrandBrain from '@/models/BrandBrain';

// Helper to track usage with timing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function track(userId: string, feature: AIFeature, response: any, startMs: number) {
  trackAIUsage({ userId, feature, response, durationMs: Date.now() - startMs });
}

// ---------------------------------------------------------------------------
// Custom Prompt Integration
// ---------------------------------------------------------------------------

/**
 * Builds the full system prompt by concatenating the base prompt with
 * global AI Documents and user-scoped AI Documents for the given category.
 * Injection order: base prompt -> global docs -> user docs.
 */
export async function buildSystemPrompt(
  basePrompt: string,
  category: AIDocumentCategory,
  userId?: string
): Promise<string> {
  try {
    await dbConnect();

    // Run all DB queries in parallel for performance
    const [globalDocs, userDocs, brandBrain] = await Promise.all([
      // Fetch global documents for this category
      AIDocument.find({ category, scope: 'global' })
        .sort({ sortOrder: 1 })
        .lean()
        .then((docs) => docs.filter((d) => d.category !== 'student_profile')),
      // Fetch user-scoped documents if userId provided
      userId
        ? AIDocument.find({ category, userId }).sort({ sortOrder: 1 }).lean()
        : Promise.resolve([]),
      // Fetch the student's BrandBrain compiled profile if userId provided
      userId
        ? BrandBrain.findOne({ userId }).select('compiledProfile').lean()
        : Promise.resolve(null),
    ]);

    const globalSection =
      globalDocs.length > 0
        ? globalDocs.map((d) => `## ${d.title}\n${d.content}`).join('\n\n')
        : '';

    // Inject compiled student profile between global docs and user docs
    const compiledProfileContent =
      brandBrain &&
      brandBrain.compiledProfile &&
      brandBrain.compiledProfile.content
        ? `## Student Profile\n${brandBrain.compiledProfile.content}`
        : '';

    const userSection =
      userDocs.length > 0
        ? userDocs.map((d) => `## ${d.title}\n${d.content}`).join('\n\n')
        : '';

    const parts = [basePrompt, globalSection, compiledProfileContent, userSection].filter(
      Boolean
    );

    if (parts.length === 1) {
      return basePrompt;
    }

    return parts.join('\n\n');
  } catch (error) {
    console.error('Failed to fetch AI documents, using base prompt:', error);
    return basePrompt;
  }
}

// ---------------------------------------------------------------------------
// Tone of Voice Guide Generation
// ---------------------------------------------------------------------------

interface ContentDNAInput {
  responses: {
    questionId: string;
    question: string;
    answer: string | string[];
    answerType: string;
  }[];
  contentSamples?: {
    text: string;
    type: string;
  }[];
  creatorExamples?: {
    url: string;
    platform: string;
    extractedTranscript: string;
  }[];
}

/**
 * Calls Claude to analyse Content DNA questionnaire responses (and optional
 * transcripts) and returns a structured Tone of Voice Guide.
 */
export async function generateToneOfVoice(
  contentDNA: ContentDNAInput,
  transcripts?: string[],
  userId?: string
): Promise<ToneOfVoiceGuideOutput> {
  const client = getAnthropicClient();

  // Build the user message with all available context
  const userParts: string[] = [];

  // Questionnaire responses
  userParts.push('## Questionnaire Responses');
  for (const r of contentDNA.responses) {
    const answer = Array.isArray(r.answer) ? r.answer.join(', ') : r.answer;
    userParts.push(`**${r.question}**\n${answer}\n`);
  }

  // Content samples
  if (contentDNA.contentSamples && contentDNA.contentSamples.length > 0) {
    userParts.push('\n## Content Samples (written by the creator)');
    for (const sample of contentDNA.contentSamples) {
      userParts.push(`### ${sample.type}\n${sample.text}\n`);
    }
  }

  // Creator examples with extracted transcripts
  if (contentDNA.creatorExamples && contentDNA.creatorExamples.length > 0) {
    const withTranscripts = contentDNA.creatorExamples.filter(
      (e) => e.extractedTranscript
    );
    if (withTranscripts.length > 0) {
      userParts.push('\n## Creator Examples (transcripts from videos they admire)');
      for (const ex of withTranscripts) {
        userParts.push(
          `### ${ex.platform} — ${ex.url}\n${ex.extractedTranscript}\n`
        );
      }
    }
  }

  // Additional transcripts (YouTube, coaching calls, etc.)
  if (transcripts && transcripts.length > 0) {
    userParts.push('\n## Additional Transcripts');
    for (let i = 0; i < transcripts.length; i++) {
      userParts.push(`### Transcript ${i + 1}\n${transcripts[i]}\n`);
    }
  }

  userParts.push(
    '\nPlease analyze all of the above and generate a comprehensive Tone of Voice Guide.'
  );

  const toneSystemPrompt = await buildSystemPrompt(TONE_OF_VOICE_SYSTEM_PROMPT, 'tone_of_voice', userId);

  const startMs = Date.now();
  const response = await withRetry(() =>
    client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: toneSystemPrompt,
      messages: [{ role: 'user', content: userParts.join('\n') }],
    })
  );
  if (userId) track(userId, 'tone_of_voice', response, startMs);

  // Extract the text content from Claude's response
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned an unexpected response format.');
  }

  // Parse the JSON output
  let parsed: { parameters: ToneOfVoiceParameter[]; summary: string };
  try {
    parsed = extractJsonFromResponse(textBlock.text) as { parameters: ToneOfVoiceParameter[]; summary: string };
  } catch {
    throw new Error(
      'Failed to parse Claude response as JSON. The model may have returned malformed output.'
    );
  }

  // Validate minimal structure
  if (!Array.isArray(parsed.parameters) || typeof parsed.summary !== 'string') {
    throw new Error(
      'Claude returned JSON but it does not match the expected ToneOfVoiceGuide shape.'
    );
  }

  return {
    parameters: parsed.parameters,
    summary: parsed.summary,
    generatedAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Content Pillar Generation
// ---------------------------------------------------------------------------

/**
 * Calls Claude to analyse Content DNA questionnaire responses and returns
 * 3-5 content pillars, each with a title, description, and keywords.
 */
export async function generateContentPillars(
  contentDNAResponses: { question: string; answer: string | string[] }[],
  userId?: string
): Promise<{ title: string; description: string; keywords: string[] }[]> {
  const client = getAnthropicClient();

  // Build the user message from questionnaire responses
  const userParts: string[] = [];
  userParts.push('## Questionnaire Responses');
  for (const r of contentDNAResponses) {
    const answer = Array.isArray(r.answer) ? r.answer.join(', ') : r.answer;
    userParts.push(`**${r.question}**\n${answer}\n`);
  }
  userParts.push(
    '\nPlease analyze the above responses and generate content pillars for this creator.'
  );

  const pillarSystemPrompt = await buildSystemPrompt(
    CONTENT_PILLAR_GENERATION_PROMPT,
    'content_pillar_generation',
    userId
  );

  const startMs = Date.now();
  const response = await withRetry(() =>
    client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: pillarSystemPrompt,
      messages: [{ role: 'user', content: userParts.join('\n') }],
    })
  );
  if (userId) track(userId, 'content_pillar_generation', response, startMs);

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned an unexpected response format.');
  }

  let parsed: { title: string; description: string; keywords: string[] }[];
  try {
    parsed = extractJsonFromResponse(textBlock.text) as {
      title: string;
      description: string;
      keywords: string[];
    }[];
  } catch {
    throw new Error(
      'Failed to parse Claude response as JSON. The model may have returned malformed output.'
    );
  }

  // Validate minimal structure
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(
      'Claude returned JSON but it does not match the expected content pillars shape.'
    );
  }

  for (const pillar of parsed) {
    if (
      typeof pillar.title !== 'string' ||
      typeof pillar.description !== 'string' ||
      !Array.isArray(pillar.keywords)
    ) {
      throw new Error('One or more generated pillars have invalid structure.');
    }
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Brain Dump Processing
// ---------------------------------------------------------------------------

/**
 * Processes a brain dump call transcript and extracts content ideas, stories,
 * insights, and recurring themes.
 *
 * Calls Claude with the brain dump prompt. Throws if the API key is missing
 * or if the API call fails.
 */
export async function processBrainDump(
  transcript: string,
  contentPillars: string[],
  userId?: string
): Promise<BrainDumpOutput> {
  const client = getAnthropicClient();

  const pillarsContext =
    contentPillars.length > 0
      ? `\n\n## Creator's Content Pillars\n${contentPillars.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
      : '\n\n## Creator\'s Content Pillars\nNo content pillars defined yet. Use "uncategorized" for all theme mappings.';

  const brainDumpSystemPrompt = await buildSystemPrompt(BRAIN_DUMP_PROCESSING_PROMPT, 'brain_dump_processing', userId);

  const startMs = Date.now();
  const response = await withRetry(() =>
    client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: brainDumpSystemPrompt,
      messages: [
        {
          role: 'user',
          content: `## Call Transcript\n${transcript}${pillarsContext}\n\nPlease analyze this brain dump transcript and extract all valuable content.`,
        },
      ],
    })
  );
  if (userId) track(userId, 'brain_dump', response, startMs);

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned an unexpected response format.');
  }

  let parsed: BrainDumpOutput;
  try {
    parsed = extractJsonFromResponse(textBlock.text) as BrainDumpOutput;
  } catch {
    throw new Error(
      'Failed to parse Claude response as JSON. The model may have returned malformed output.'
    );
  }

  // Validate minimal structure
  if (
    !Array.isArray(parsed.contentIdeas) ||
    !Array.isArray(parsed.stories) ||
    !Array.isArray(parsed.insights) ||
    !Array.isArray(parsed.themes)
  ) {
    throw new Error(
      'Claude returned JSON but it does not match the expected BrainDumpOutput shape.'
    );
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Idea Generation
// ---------------------------------------------------------------------------

/**
 * Generates content ideas using Brand Brain context and optional trend data.
 *
 * Calls Claude with the IDEA_GENERATION_SYSTEM_PROMPT and the assembled
 * Brand Brain context. Throws if the API key is missing or the call fails.
 */
export async function generateIdeas(
  brandBrainContext: string,
  _trendData?: unknown,
  patternsContext?: string,
  userId?: string
): Promise<GeneratedIdea[]> {
  const client = getAnthropicClient();

  const userMessage = [
    brandBrainContext || '(No Brand Brain context available yet — generate general creator ideas.)',
    _trendData ? `\n## Trend Data\n${JSON.stringify(_trendData)}` : '',
    patternsContext ? `\n## User Approval/Rejection Patterns\n${patternsContext}` : '',
    '\nGenerate 6-8 concrete, ready-to-film video ideas based on the above context.',
  ].join('\n');

  // Dynamically inject the YouTube title guide from Renee's public Google Doc
  const { fetchGoogleDocText } = await import('@/lib/google-doc-fetcher');
  const titleGuide = await fetchGoogleDocText('1zKZDrQzg1NIiFT9QOea6i5sNBFGmxphn1OGevQp6Sik');
  console.log(`[idea-gen] YouTube title guide: ${titleGuide ? `loaded (${titleGuide.length} chars)` : 'MISSING - falling back to base prompt'}`);
  const promptWithGuide = titleGuide
    ? `${IDEA_GENERATION_SYSTEM_PROMPT}\n\n## YouTube Title & Idea Guide\nFollow the rules, formats, and frameworks in this guide when crafting titles and ideas:\n\n${titleGuide}`
    : IDEA_GENERATION_SYSTEM_PROMPT;

  const ideaSystemPrompt = await buildSystemPrompt(promptWithGuide, 'idea_generation', userId);

  const startMs = Date.now();
  const response = await withRetry(() =>
    client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: ideaSystemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })
  );
  if (userId) track(userId, 'idea_generation', response, startMs);

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned an unexpected response format.');
  }

  const parsed = extractJsonFromResponse(textBlock.text) as GeneratedIdea[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(
      'Claude returned JSON but it does not match the expected GeneratedIdea[] shape.'
    );
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Script Generation
// ---------------------------------------------------------------------------

/**
 * Generates a full script from an approved idea, voice-storming transcript,
 * and Brand Brain context using Claude.
 *
 * Throws if the API key is missing or if the API call fails.
 */
export async function generateScript(
  ideaTitle: string,
  ideaDescription: string,
  brandBrainContext: string,
  voiceStormTranscript?: string,
  toneOfVoiceContext?: string,
  callToAction?: string,
  userId?: string,
  outline?: string,
  resources?: { type: string; name: string; content: string }[],
  conceptAnswers?: { whoIsThisFor?: string; whatWillTheyLearn?: string; whyShouldTheyCare?: string },
): Promise<GeneratedScript> {
  const client = getAnthropicClient();

  // Build user message with all available context
  const userParts: string[] = [];

  userParts.push('## Content Idea');
  userParts.push(`**Title:** ${ideaTitle}`);
  if (ideaDescription) {
    userParts.push(`**Description:** ${ideaDescription}`);
  }

  if (conceptAnswers && (conceptAnswers.whoIsThisFor || conceptAnswers.whatWillTheyLearn || conceptAnswers.whyShouldTheyCare)) {
    userParts.push('\n## Concept');
    if (conceptAnswers.whoIsThisFor) {
      userParts.push(`**Who is this for:** ${conceptAnswers.whoIsThisFor}`);
    }
    if (conceptAnswers.whatWillTheyLearn) {
      userParts.push(`**What will they learn:** ${conceptAnswers.whatWillTheyLearn}`);
    }
    if (conceptAnswers.whyShouldTheyCare) {
      userParts.push(`**Why should they care:** ${conceptAnswers.whyShouldTheyCare}`);
    }
  }

  if (outline) {
    userParts.push(`\n## Video Outline\n${outline}`);
  }

  if (resources && resources.length > 0) {
    userParts.push('\n## Research & Resources');
    for (const resource of resources) {
      userParts.push(`### ${resource.name} (${resource.type})\n${resource.content}`);
    }
  }

  if (brandBrainContext) {
    userParts.push(`\n${brandBrainContext}`);
  }

  if (toneOfVoiceContext) {
    userParts.push(`\n## Tone of Voice Guide\n${toneOfVoiceContext}`);
  }

  if (voiceStormTranscript) {
    userParts.push(`\n## Voice Storming Transcript\nUse this as the primary source of ideas, anecdotes, and natural phrasing:\n\n${voiceStormTranscript}`);
  }

  if (callToAction) {
    userParts.push(`\n## Call to Action\nThe script should end with this call to action: ${callToAction}`);
  }

  userParts.push(
    '\nPlease generate a complete video script based on the above context. Return ONLY valid JSON with the fields: title, fullScript, bulletPoints (array of strings), and teleprompterVersion.'
  );

  const scriptSystemPrompt = await buildSystemPrompt(SCRIPT_GENERATION_SYSTEM_PROMPT, 'script_generation', userId);

  const startMs = Date.now();
  const response = await withRetry(() =>
    client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: scriptSystemPrompt,
      messages: [{ role: 'user', content: userParts.join('\n') }],
    })
  );
  if (userId) track(userId, 'script_generation', response, startMs);

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned an unexpected response format.');
  }

  let parsed: GeneratedScript;
  try {
    parsed = extractJsonFromResponse(textBlock.text) as GeneratedScript;
  } catch {
    throw new Error(
      'Failed to parse Claude response as JSON. The model may have returned malformed output.'
    );
  }

  // Validate minimal structure
  if (
    typeof parsed.fullScript !== 'string' ||
    !Array.isArray(parsed.bulletPoints) ||
    typeof parsed.teleprompterVersion !== 'string'
  ) {
    throw new Error(
      'Claude returned JSON but it does not match the expected GeneratedScript shape.'
    );
  }

  return {
    title: parsed.title || ideaTitle,
    fullScript: parsed.fullScript,
    bulletPoints: parsed.bulletPoints,
    teleprompterVersion: parsed.teleprompterVersion,
    sections: Array.isArray(parsed.sections) ? parsed.sections : undefined,
  };
}

// ---------------------------------------------------------------------------
// Voice Storming Processing
// ---------------------------------------------------------------------------

export interface VoiceStormingInsight {
  content: string;
  contentPillar: string;
}

export interface VoiceStormingOutput {
  contentIdeas: VoiceStormingInsight[];
  personalStories: VoiceStormingInsight[];
  keyThemes: VoiceStormingInsight[];
  actionItems: VoiceStormingInsight[];
}

export async function processVoiceStorming(
  transcript: string,
  contentPillars: string[],
  userId?: string
): Promise<VoiceStormingOutput> {
  const client = getAnthropicClient();

  const pillarsContext =
    contentPillars.length > 0
      ? `\n\nContent Pillars: ${contentPillars.join(', ')}`
      : '';

  const voiceStormSystemPrompt = await buildSystemPrompt(VOICE_STORMING_PROCESSING_PROMPT, 'tone_of_voice', userId);

  const startMs = Date.now();
  const response = await withRetry(() =>
    client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: voiceStormSystemPrompt,
      messages: [
        {
          role: 'user',
          content: `## Voice Storming Transcript\n${transcript}${pillarsContext}\n\nExtract all valuable insights from this voice storming session.`,
        },
      ],
    })
  );
  if (userId) track(userId, 'voice_storming', response, startMs);

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned an unexpected response format.');
  }

  let parsed: VoiceStormingOutput;
  try {
    parsed = extractJsonFromResponse(textBlock.text) as VoiceStormingOutput;
  } catch {
    throw new Error('Failed to parse Claude response as JSON.');
  }

  // Normalize: if AI returns string arrays (old format), convert to object format
  const normalize = (items: (string | VoiceStormingInsight)[]): VoiceStormingInsight[] =>
    items.map(item =>
      typeof item === 'string' ? { content: item, contentPillar: '' } : item
    );

  parsed.contentIdeas = normalize(parsed.contentIdeas);
  parsed.personalStories = normalize(parsed.personalStories);
  parsed.keyThemes = normalize(parsed.keyThemes);
  parsed.actionItems = normalize(parsed.actionItems);

  if (
    !Array.isArray(parsed.contentIdeas) ||
    !Array.isArray(parsed.personalStories) ||
    !Array.isArray(parsed.keyThemes) ||
    !Array.isArray(parsed.actionItems)
  ) {
    throw new Error('Claude returned JSON but it does not match the expected VoiceStormingOutput shape.');
  }

  return parsed;
}

export async function generateSessionTitle(transcript: string, userId?: string): Promise<string> {
  const client = getAnthropicClient();
  const truncated = transcript.slice(0, 500);

  try {
    const startMs = Date.now();
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: `Generate a 2-5 word title summarizing this voice storming session. Be specific and descriptive, like naming a conversation. Return only the title, no quotes or punctuation.\n\n${truncated}`,
        },
      ],
    });
    if (userId) track(userId, 'session_title', response, startMs);

    const textBlock = response.content.find((b) => b.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      return textBlock.text.trim().replace(/^["']|["']$/g, '');
    }
  } catch (err) {
    console.error('Title generation failed, using fallback:', err);
  }

  // Fallback: first 5 words
  const words = transcript.trim().split(/\s+/).slice(0, 5);
  return words.join(' ') + (transcript.trim().split(/\s+/).length > 5 ? '...' : '');
}

// ---------------------------------------------------------------------------
// Side Quest Generation
// ---------------------------------------------------------------------------

// Re-export for convenience (canonical definition is in @/types/ai)
export type { GeneratedSideQuest } from '@/types/ai';

interface SideQuestGenerationOptions {
  currentWeek?: number;
  recentCategories?: string[];
  daysSinceLastActivity?: number;
  studentState?: 'normal' | 'stuck' | 'returning' | 'momentum';
}

/**
 * Generates 3 personalized side quests using the student's Brand Brain context
 * and the neuroscience-informed framework v2 (energy tiers, 4 categories,
 * Four C's motivation, phase awareness, rotation rules, state-sensitive delivery).
 */
export async function generateSideQuests(
  brandBrainContext: string,
  existingQuestTitles: string[] = [],
  userId?: string,
  options: SideQuestGenerationOptions = {}
): Promise<GeneratedSideQuest[]> {
  const client = getAnthropicClient();

  const contextParts: string[] = [];

  // Brand Brain context
  if (brandBrainContext && brandBrainContext.trim()) {
    contextParts.push(`STUDENT'S BRAND BRAIN CONTEXT:\n${brandBrainContext}`);
  } else {
    contextParts.push(`STUDENT'S BRAND BRAIN CONTEXT:\nThis is a new creator. No Brand Brain data available yet. Generate quests suitable for someone just starting their content journey. Default motivation driver to "create".`);
  }

  // Phase awareness
  if (options.currentWeek) {
    contextParts.push(`CURRENT PROGRAM WEEK: ${options.currentWeek}`);
  }

  // Rotation context
  if (options.recentCategories && options.recentCategories.length > 0) {
    contextParts.push(`LAST 4 QUEST CATEGORIES (most recent first): ${options.recentCategories.join(', ')}\nApply rotation rules: avoid repeating the most recent category, ensure variety.`);
  }

  // State-sensitive delivery
  if (options.daysSinceLastActivity !== undefined) {
    if (options.daysSinceLastActivity >= 5) {
      contextParts.push(`STUDENT STATE: Inactive for ${options.daysSinceLastActivity} days. This is an overwhelm signal, not laziness. Serve Spark quests ONLY. Never serve Hyperfocus. Frame quests as zero-friction re-entry.`);
    } else if (options.daysSinceLastActivity >= 2) {
      contextParts.push(`STUDENT STATE: Inactive for ${options.daysSinceLastActivity} days. Lower the activation barrier. Prefer Spark quests.`);
    }
  }

  if (options.studentState === 'stuck') {
    contextParts.push(`STUDENT STATE: Student reports feeling stuck or overwhelmed. Serve Spark quests ONLY. Lower the bar. Do not try to motivate through the overwhelm.`);
  } else if (options.studentState === 'momentum') {
    contextParts.push(`STUDENT STATE: Student just had a win or completed something. Ride the momentum. Offer Flow or Hyperfocus quests that build on the energy.`);
  } else if (options.studentState === 'returning') {
    contextParts.push(`STUDENT STATE: Student returning after a gap. Never reference the gap. Serve Spark with zero friction. The quest itself is the re-entry.`);
  }

  // Exclusion list
  if (existingQuestTitles.length > 0) {
    contextParts.push(`EXISTING QUEST TITLES (do not repeat these):\n${existingQuestTitles.join('\n')}`);
  }

  const userMessage = contextParts.join('\n\n---\n\n');

  const sideQuestSystemPrompt = await buildSystemPrompt(SIDE_QUEST_GENERATION_PROMPT, 'side_quest_generation', userId);

  const startMs = Date.now();
  const response = await withRetry(() =>
    client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 3000,
      system: sideQuestSystemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })
  );
  if (userId) track(userId, 'side_quests', response, startMs);

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned an unexpected response format.');
  }

  const parsed = extractJsonFromResponse(textBlock.text);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('AI returned invalid side quest format');
  }

  const VALID_TYPES = ['voice_storm_prompt', 'research_task', 'content_exercise'];
  const VALID_CATEGORIES = ['brand_brain_fuel', 'scroll_study', 'hook_gym', 'record_button_reps'];
  const VALID_TIERS = ['spark', 'flow', 'hyperfocus'];
  const VALID_DRIVERS = ['captivate', 'create', 'compete', 'complete'];
  const VALID_TRACKS = ['both', 'long_form', 'short_form'];

  const quests: GeneratedSideQuest[] = (parsed as Record<string, unknown>[])
    .filter((q) =>
      q && typeof q.title === 'string' && typeof q.description === 'string' &&
      typeof q.type === 'string' && typeof q.prompt === 'string' &&
      VALID_TYPES.includes(q.type as string)
    )
    .map((q) => ({
      title: (q.title as string).trim(),
      description: (q.description as string).trim(),
      type: q.type as GeneratedSideQuest['type'],
      prompt: (q.prompt as string).trim(),
      xpReward: Math.min(25, Math.max(5, Number(q.xpReward) || 15)),
      estimatedMinutes: Math.min(60, Math.max(2, Number(q.estimatedMinutes) || 10)),
      category: VALID_CATEGORIES.includes(q.category as string)
        ? (q.category as GeneratedSideQuest['category'])
        : 'brand_brain_fuel',
      energyTier: VALID_TIERS.includes(q.energyTier as string)
        ? (q.energyTier as GeneratedSideQuest['energyTier'])
        : 'flow',
      motivationDriver: VALID_DRIVERS.includes(q.motivationDriver as string)
        ? (q.motivationDriver as GeneratedSideQuest['motivationDriver'])
        : undefined,
      track: VALID_TRACKS.includes(q.track as string)
        ? (q.track as GeneratedSideQuest['track'])
        : 'both',
      whyThisMatters: typeof q.whyThisMatters === 'string' ? q.whyThisMatters.trim() : undefined,
      rescueStatement: typeof q.rescueStatement === 'string' ? q.rescueStatement.trim() : undefined,
      bonusRound: typeof q.bonusRound === 'string' ? q.bonusRound.trim() : undefined,
      deliverable: typeof q.deliverable === 'string' ? q.deliverable.trim() : undefined,
    }));

  if (quests.length === 0) {
    throw new Error('No valid quests after validation');
  }

  return quests;
}

// ---------------------------------------------------------------------------
// Personal Baseline Processing
// ---------------------------------------------------------------------------

export interface PersonalBaselineOutput {
  background: string;
  neurodivergentProfile: string;
  contentGoals: string;
  riskFlags: string[];
  equipmentProfile?: { camera: string; location: string; constraints: string };
}

/**
 * Calls Claude to analyse Personal Baseline survey responses (and optionally
 * Content DNA responses) and returns structured student profile fields and
 * risk flags for the coaching team.
 */
export async function processPersonalBaseline(
  baselineResponses: { question: string; answer: string | string[] }[],
  contentDNAResponses?: { question: string; answer: string | string[] }[],
  userId?: string
): Promise<PersonalBaselineOutput> {
  const client = getAnthropicClient();

  // Build the user message with all available context
  const userParts: string[] = [];

  userParts.push('## Personal Baseline Survey Responses');
  for (const r of baselineResponses) {
    const answer = Array.isArray(r.answer) ? r.answer.join(', ') : r.answer;
    if (answer.trim()) {
      userParts.push(`**${r.question}**\n${answer}\n`);
    }
  }

  if (contentDNAResponses && contentDNAResponses.length > 0) {
    userParts.push('\n## Content DNA Questionnaire Responses (additional context)');
    for (const r of contentDNAResponses) {
      const answer = Array.isArray(r.answer) ? r.answer.join(', ') : r.answer;
      if (answer.trim()) {
        userParts.push(`**${r.question}**\n${answer}\n`);
      }
    }
  }

  userParts.push(
    '\nPlease analyze the above survey responses and generate a structured student profile with risk flags.'
  );

  const systemPrompt = await buildSystemPrompt(
    PERSONAL_BASELINE_PROCESSING_PROMPT,
    'personal_baseline_processing',
    userId
  );

  const startMs = Date.now();
  const response = await withRetry(() =>
    client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userParts.join('\n') }],
    })
  );
  if (userId) track(userId, 'personal_baseline_processing', response, startMs);

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned an unexpected response format.');
  }

  let parsed: PersonalBaselineOutput;
  try {
    parsed = extractJsonFromResponse(textBlock.text) as PersonalBaselineOutput;
  } catch {
    throw new Error(
      'Failed to parse Claude response as JSON. The model may have returned malformed output.'
    );
  }

  // Validate minimal structure
  if (
    typeof parsed.background !== 'string' ||
    typeof parsed.neurodivergentProfile !== 'string' ||
    typeof parsed.contentGoals !== 'string' ||
    !Array.isArray(parsed.riskFlags)
  ) {
    throw new Error(
      'Claude returned JSON but it does not match the expected PersonalBaselineOutput shape.'
    );
  }

  return parsed;
}
