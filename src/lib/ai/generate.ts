import { getAnthropicClient, CLAUDE_MODEL } from './client';
import {
  TONE_OF_VOICE_SYSTEM_PROMPT,
  BRAIN_DUMP_PROCESSING_PROMPT,
  IDEA_GENERATION_SYSTEM_PROMPT,
  SCRIPT_GENERATION_SYSTEM_PROMPT,
} from './prompts';
import type {
  ToneOfVoiceGuideOutput,
  ToneOfVoiceParameter,
  GeneratedIdea,
  GeneratedScript,
  BrainDumpOutput,
} from '@/types/ai';

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
  transcripts?: string[]
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

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: TONE_OF_VOICE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userParts.join('\n') }],
  });

  // Extract the text content from Claude's response
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned an unexpected response format.');
  }

  // Parse the JSON output
  let parsed: { parameters: ToneOfVoiceParameter[]; summary: string };
  try {
    parsed = JSON.parse(textBlock.text);
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
 * When ANTHROPIC_API_KEY is available, calls Claude with the brain dump prompt.
 * When the key is NOT available, returns realistic mock data.
 */
export async function processBrainDump(
  transcript: string,
  contentPillars: string[]
): Promise<BrainDumpOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Return realistic mock data when no API key is available
    return {
      contentIdeas: [
        {
          title: '5 Things I Wish I Knew Before Starting My Business',
          description:
            'A list-format video sharing hard-won lessons from the creator\'s entrepreneurial journey. Pairs personal storytelling with actionable advice that viewers can apply immediately.',
          contentPillar: contentPillars[0] || 'uncategorized',
          angle: 'Hindsight wisdom combined with vulnerability',
        },
        {
          title: 'Why Most Content Strategies Fail (And What to Do Instead)',
          description:
            'A myth-busting video that challenges conventional content advice and offers a contrarian approach backed by real results.',
          contentPillar: contentPillars[1] || 'uncategorized',
          angle: 'Contrarian take backed by personal experience',
        },
        {
          title: 'The Morning Routine That Changed Everything for My Business',
          description:
            'Behind-the-scenes look at how a simple routine shift led to dramatic productivity gains. Relatable and actionable.',
          contentPillar: contentPillars[0] || 'uncategorized',
          angle: 'Personal transformation story with practical takeaways',
        },
        {
          title: 'How I Landed My First 10 Clients (Step by Step)',
          description:
            'A tactical breakdown of exactly what worked to get the first paying clients, with specific outreach strategies and scripts.',
          contentPillar: contentPillars[2] || 'uncategorized',
          angle: 'Tactical, step-by-step guide from personal experience',
        },
      ],
      stories: [
        {
          summary:
            'Creator shares the moment they almost gave up on their business after a failed product launch, and what made them keep going.',
          fullText:
            'I remember sitting in my car after that launch completely bombed. I had spent three months building it and nobody bought it. I literally called my mom and said I think I need to get a real job. But then one customer emailed me and said it changed their life...',
        },
        {
          summary:
            'An anecdote about a client who tripled their revenue after implementing a simple content strategy change.',
          fullText:
            'I had this client who was posting every single day and getting zero traction. We stripped it down to three posts a week but made each one really intentional. Within two months their revenue tripled. Sometimes less really is more.',
        },
      ],
      insights: [
        {
          content:
            'Most creators burn out because they optimize for quantity over quality. The algorithm rewards engagement depth, not posting frequency.',
          tags: ['content strategy', 'burnout prevention', 'algorithm'],
        },
        {
          content:
            'Building a personal brand is not about being perfect — it is about being consistently authentic. People connect with real stories, not polished presentations.',
          tags: ['personal branding', 'authenticity', 'audience connection'],
        },
      ],
      themes: [
        {
          theme: 'Authenticity over perfection',
          contentPillar: contentPillars[0] || 'uncategorized',
          occurrences: 3,
        },
        {
          theme: 'Quality over quantity in content creation',
          contentPillar: contentPillars[1] || 'uncategorized',
          occurrences: 2,
        },
        {
          theme: 'Learning from failure',
          contentPillar: contentPillars[0] || 'uncategorized',
          occurrences: 2,
        },
      ],
    };
  }

  // Call Claude with the brain dump processing prompt
  const client = getAnthropicClient();

  const pillarsContext =
    contentPillars.length > 0
      ? `\n\n## Creator's Content Pillars\n${contentPillars.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
      : '\n\n## Creator\'s Content Pillars\nNo content pillars defined yet. Use "uncategorized" for all theme mappings.';

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: BRAIN_DUMP_PROCESSING_PROMPT,
    messages: [
      {
        role: 'user',
        content: `## Call Transcript\n${transcript}${pillarsContext}\n\nPlease analyze this brain dump transcript and extract all valuable content.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned an unexpected response format.');
  }

  let parsed: BrainDumpOutput;
  try {
    parsed = JSON.parse(textBlock.text);
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

/** Full set of mock ideas returned when no API key is configured. */
const MOCK_IDEAS: GeneratedIdea[] = [
  {
    title: '5 Things I Wish I Knew Before Starting My Business',
    description:
      'Share the hard-won lessons from your entrepreneurial journey in a punchy list format. Lead with your biggest mistake, then reverse-engineer the fix. Personal storytelling meets actionable advice — viewers save this kind of video.',
    contentPillar: 'Entrepreneurship',
    angle: 'Hindsight wisdom paired with vulnerability — "here is what I got wrong and how you can skip the pain"',
  },
  {
    title: 'Why Most Content Strategies Fail (And What Actually Works)',
    description:
      'Call out the generic advice everyone repeats — post 3x a week, use trending audio, etc. — then reveal what moved the needle for you. Back it up with real numbers or screenshots if possible.',
    contentPillar: 'Content Strategy',
    angle: 'Contrarian myth-busting backed by personal results',
  },
  {
    title: 'I Recorded 30 Videos in 30 Days — Here\'s What Happened',
    description:
      'Document the highs, lows, and surprising lessons from an intense content sprint. Great for relatability and showing the messy middle of content creation that most creators hide.',
    contentPillar: 'Behind the Scenes',
    angle: 'Challenge/experiment format — viewers love watching someone commit to something hard',
  },
  {
    title: 'The $0 Marketing Strategy That Got Me My First 1,000 Followers',
    description:
      'Walk through a specific, repeatable strategy you used to grow from zero with no ad spend. Step-by-step tutorial format with screen recordings or real examples.',
    contentPillar: 'Growth & Marketing',
    angle: 'Accessible underdog story — no budget, just hustle and smart tactics',
  },
  {
    title: 'How I Beat Procrastination as a Creator with ADHD',
    description:
      'Share your real systems, workarounds, and mindset shifts for getting content out the door when your brain fights you every step of the way. Normalize the struggle while offering practical tools.',
    contentPillar: 'Productivity',
    angle: 'Lived experience + actionable hacks — relatable to a huge underserved audience',
  },
  {
    title: 'Stop Trying to Go Viral — Do This Instead',
    description:
      'Argue that chasing virality is a trap and lay out a more sustainable content flywheel. Use your own analytics to show how consistent, niche content compounds over time.',
    contentPillar: 'Content Strategy',
    angle: 'Anti-hype positioning — calm authority against the noise of "growth hack" culture',
  },
  {
    title: 'The Exact Equipment I Use to Film Professional Videos at Home',
    description:
      'Give a full studio tour and gear breakdown, from camera to lighting to audio. Emphasize budget-friendly options and explain WHY each piece matters, not just what it is.',
    contentPillar: 'Behind the Scenes',
    angle: 'Practical transparency — show the actual setup, not an aspirational one',
  },
  {
    title: 'What Nobody Tells You About Your First Year on YouTube',
    description:
      'An honest, emotional take on the reality of year one: slow growth, self-doubt, comparison spirals, and the small wins that keep you going. End with what made it worth it.',
    contentPillar: 'Entrepreneurship',
    angle: 'Raw storytelling that builds parasocial trust — the "real talk" video every new creator needs',
  },
];

/**
 * Generates content ideas using Brand Brain context and optional trend data.
 *
 * When an Anthropic API key is configured, this calls Claude with the
 * IDEA_GENERATION_SYSTEM_PROMPT and the assembled Brand Brain context.
 * Otherwise it returns rich mock data so the UI is fully functional.
 */
export async function generateIdeas(
  brandBrainContext: string,
  _trendData?: unknown
): Promise<GeneratedIdea[]> {
  // Try real generation if a client is available
  try {
    const client = getAnthropicClient();

    const userMessage = [
      brandBrainContext || '(No Brand Brain context available yet — generate general creator ideas.)',
      _trendData ? `\n## Trend Data\n${JSON.stringify(_trendData)}` : '',
      '\nGenerate 6-8 concrete, ready-to-film video ideas based on the above context.',
    ].join('\n');

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: IDEA_GENERATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      const parsed: GeneratedIdea[] = JSON.parse(textBlock.text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // API key missing or call failed — fall through to mock data
  }

  // Return a randomised subset of mock ideas (5-8) for variety
  const shuffled = [...MOCK_IDEAS].sort(() => Math.random() - 0.5);
  const count = 5 + Math.floor(Math.random() * 4); // 5-8
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ---------------------------------------------------------------------------
// Script Generation (placeholder — returns mock data)
// ---------------------------------------------------------------------------

/**
 * Generates a full script from an approved idea, voice-storming transcript,
 * and Brand Brain context.
 *
 * Currently returns mock data. Will be wired to Claude in a future sprint.
 */
export async function generateScript(
  _ideaId: string,
  _voiceStormTranscript: string,
  _brandBrainContext: string
): Promise<GeneratedScript> {
  // Placeholder: when wired up, this will call Claude with
  // SCRIPT_GENERATION_SYSTEM_PROMPT + all inputs.
  void SCRIPT_GENERATION_SYSTEM_PROMPT;

  return {
    title: '5 Things I Wish I Knew Before Starting My Business',
    fullScript: 'Have you ever looked back on something you did and thought, "If I could just tell my past self ONE thing..."? Yeah. I have about five of those. And today I\'m going to share them with you because I genuinely believe they would have saved me years of frustration.\n\nSo let me set the scene. Three years ago, I was sitting in my apartment with a laptop, a half-baked idea, and way too much confidence. I thought starting a business was basically: have idea, build thing, make money. Spoiler alert \u2014 it is nothing like that.\n\nHere\'s thing number one: Nobody cares about your product. I know that sounds harsh, but hear me out. When I launched my first thing, I spent six months building it in secret, polishing every little detail, and then I put it out into the world expecting fireworks. Crickets. Total silence. The lesson? People don\'t buy products \u2014 they buy solutions to problems they already know they have. Start with the problem, not the product.\n\nNumber two \u2014 and this one stung \u2014 you are not your customer. I kept building features I thought were cool. I kept writing copy that sounded good to ME. But I wasn\'t the person buying it. The moment I actually started talking to real customers, like picking up the phone and having awkward conversations, everything changed. Their language became my marketing. Their frustrations became my roadmap.\n\nThird thing: Cash flow is not profit. This one almost killed my business. I had months where revenue looked great on paper, but I couldn\'t pay my bills because the money was tied up in inventory or clients were paying net-60. Learn basic accounting. Seriously. Even if you hate numbers, this will save you.\n\nNumber four: Your first hire will either make or break you. I hired my first employee based on vibes. We got along great, had amazing brainstorming sessions, but they couldn\'t execute. I learned that the first person you bring on needs to be someone who is strong where you\'re weak, not someone who\'s basically a clone of you.\n\nAnd finally, number five \u2014 the one I wish someone had tattooed on my forehead: Done is better than perfect. I wasted so much time trying to make everything flawless before shipping. Meanwhile, competitors were putting out "good enough" versions and iterating based on real feedback. Perfectionism isn\'t a flex \u2014 it\'s a trap.\n\nSo there you have it. Five lessons, three years of mistakes, and hopefully a few shortcuts for you. If any of these hit home, drop a comment and tell me which one \u2014 I genuinely want to know. And if you\'re in the middle of starting something right now, subscribe because I share stuff like this every week. I\'ll see you in the next one.',
    bulletPoints: [
      'Hook: "If I could tell my past self ONE thing..." \u2014 set up the 5 lessons',
      'Set the scene: 3 years ago, apartment, laptop, overconfidence',
      'Lesson 1: Nobody cares about your product \u2014 they care about their problem',
      'Lesson 2: You are not your customer \u2014 talk to real people, use their language',
      'Lesson 3: Cash flow is not profit \u2014 learn basic accounting or pay the price',
      'Lesson 4: Your first hire matters \u2014 hire for complementary strengths, not vibes',
      'Lesson 5: Done beats perfect \u2014 perfectionism is a trap, ship and iterate',
      'CTA: Comment which lesson resonated, subscribe for weekly content',
    ],
    teleprompterVersion: 'HOOK \u2192 "Ever looked back and wished you could tell past-self ONE thing?"\n\nSCENE \u2192 3 years ago, apartment, laptop, too much confidence\n\n1 \u2192 NOBODY CARES ABOUT YOUR PRODUCT\n    They buy solutions to known problems\n    Story: 6 months building in secret \u2192 crickets\n\n2 \u2192 YOU ARE NOT YOUR CUSTOMER\n    Stop building for yourself\n    Talk to real customers \u2192 their words become your marketing\n\n3 \u2192 CASH FLOW \u2260 PROFIT\n    Revenue looked great, couldn\'t pay bills\n    Learn basic accounting\n\n4 \u2192 FIRST HIRE MAKES OR BREAKS YOU\n    Hired on vibes \u2192 couldn\'t execute\n    Hire where you\'re weak\n\n5 \u2192 DONE > PERFECT\n    Competitors shipped "good enough" and iterated\n    Perfectionism is a trap\n\nCTA \u2192 Which lesson hit home? Comment + Subscribe',
  };
}
