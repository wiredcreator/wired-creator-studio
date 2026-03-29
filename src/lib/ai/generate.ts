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
import CustomPrompt from '@/models/CustomPrompt';
import type { CustomPromptCategory } from '@/models/CustomPrompt';

// Helper to track usage with timing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function track(userId: string, feature: AIFeature, response: any, startMs: number) {
  trackAIUsage({ userId, feature, response, durationMs: Date.now() - startMs });
}

// ---------------------------------------------------------------------------
// Custom Prompt Integration
// ---------------------------------------------------------------------------

/**
 * Fetches all active custom prompts for a given category and appends them
 * to the base system prompt. Returns the augmented system prompt string.
 */
async function getAugmentedSystemPrompt(
  basePrompt: string,
  category: CustomPromptCategory
): Promise<string> {
  try {
    await dbConnect();
    const customPrompts = await CustomPrompt.find({
      category,
      isActive: true,
    })
      .sort({ createdAt: 1 })
      .lean();

    if (customPrompts.length === 0) {
      return basePrompt;
    }

    const customSection = customPrompts
      .map((p) => `## Custom Instructions: ${p.name}\n${p.promptText}`)
      .join('\n\n');

    return `${basePrompt}\n\n${customSection}`;
  } catch (error) {
    // If custom prompt fetch fails, fall back to the base prompt
    console.error('Failed to fetch custom prompts, using base prompt:', error);
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

  const toneSystemPrompt = await getAugmentedSystemPrompt(TONE_OF_VOICE_SYSTEM_PROMPT, 'tone_of_voice');

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

  const brainDumpSystemPrompt = await getAugmentedSystemPrompt(BRAIN_DUMP_PROCESSING_PROMPT, 'brain_dump_processing');

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

  const ideaSystemPrompt = await getAugmentedSystemPrompt(IDEA_GENERATION_SYSTEM_PROMPT, 'idea_generation');

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

  const scriptSystemPrompt = await getAugmentedSystemPrompt(SCRIPT_GENERATION_SYSTEM_PROMPT, 'script_generation');

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

  const voiceStormSystemPrompt = await getAugmentedSystemPrompt(VOICE_STORMING_PROCESSING_PROMPT, 'tone_of_voice');

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

/**
 * Generates 3 personalized side quests (one of each type) using the student's
 * Brand Brain context. Falls back to null if AI generation fails, so the
 * caller can use mock data instead.
 */
export async function generateSideQuests(
  brandBrainContext: string,
  existingQuestTitles: string[] = [],
  userId?: string
): Promise<GeneratedSideQuest[]> {
  const client = getAnthropicClient();

  const userParts: string[] = [];

  if (brandBrainContext) {
    userParts.push(brandBrainContext);
  } else {
    userParts.push('(No Brand Brain context available yet. Generate generic but fun creative quests for a new content creator.)');
  }

  if (existingQuestTitles.length > 0) {
    userParts.push('\n## Exclusion List (do NOT repeat these quest titles)');
    for (const title of existingQuestTitles) {
      userParts.push(`- ${title}`);
    }
  }

  userParts.push('\nGenerate 3 personalized side quests based on the above context.');

  const sideQuestSystemPrompt = await getAugmentedSystemPrompt(SIDE_QUEST_GENERATION_PROMPT, 'side_quest_generation');

  const startMs = Date.now();
  const response = await withRetry(() =>
    client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      system: sideQuestSystemPrompt,
      messages: [{ role: 'user', content: userParts.join('\n') }],
    })
  );
  if (userId) track(userId, 'side_quests', response, startMs);

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned an unexpected response format.');
  }

  const parsed = extractJsonFromResponse(textBlock.text) as GeneratedSideQuest[];

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Claude returned JSON but it does not match the expected GeneratedSideQuest[] shape.');
  }

  // Validate each quest has the required fields and valid type
  const validTypes = new Set(['voice_storm_prompt', 'research_task', 'content_exercise']);
  for (const quest of parsed) {
    if (
      typeof quest.title !== 'string' ||
      typeof quest.description !== 'string' ||
      typeof quest.type !== 'string' ||
      typeof quest.prompt !== 'string' ||
      !validTypes.has(quest.type)
    ) {
      throw new Error('One or more generated quests have invalid structure.');
    }
  }

  return parsed;
}
