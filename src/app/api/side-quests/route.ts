import { NextRequest, NextResponse } from 'next/server';
import { aiLimiter, getRateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import dbConnect from '@/lib/db';
import SideQuest from '@/models/SideQuest';
import { createNotification } from '@/lib/notifications';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { parsePagination, paginationResponse } from '@/lib/pagination';
import { assembleBrandBrainContext } from '@/lib/ai/brand-brain-context';
import { generateSideQuests } from '@/lib/ai/generate';

// Fallback mock quests used when AI generation fails (network error, missing API key, etc.)
const MOCK_QUESTS = [
  {
    title: 'Origin Story Drop',
    description: 'Record yourself telling the story of how you got started. No script, no editing, just raw thoughts.',
    type: 'voice_storm_prompt' as const,
    prompt: 'Hit record on a voice memo right now. Talk for 3 minutes about the moment you decided to start creating content. What were you doing before? What changed? Talk like you\'re telling a friend over coffee. Save the memo when you\'re done.',
    category: 'brand_brain_fuel' as const,
    energyTier: 'spark' as const,
    track: 'both' as const,
    xpReward: 8,
    estimatedMinutes: 5,
    whyThisMatters: 'Your origin story is your unfair advantage. No one can copy a lived experience, and the Brand Brain needs it to generate content that sounds like you.',
    rescueStatement: "If this feels hard, that's normal. Start with just one sentence and see where it goes.",
    deliverable: 'Voice memo saved to Brand Brain.',
  },
  {
    title: 'Outlier Detector',
    description: 'Find 3 videos that got way more views than usual. Figure out why.',
    type: 'research_task' as const,
    prompt: 'Open YouTube right now. Find 3 videos in your space that have significantly more views than the creator\'s average. For each one, screenshot the thumbnail and write down: the exact title, why you think it performed well, and one thing you\'d steal for your own content. Time limit: 10 minutes.',
    category: 'scroll_study' as const,
    energyTier: 'flow' as const,
    track: 'both' as const,
    xpReward: 15,
    estimatedMinutes: 15,
    whyThisMatters: 'Outlier analysis builds your research instincts. Understanding why content overperforms trains your eye for packaging and hooks.',
    rescueStatement: "If you can't find outliers quickly, just pick 3 videos that caught YOUR attention. That counts.",
    bonusRound: 'Found your 3? Pick the strongest outlier and write a hook inspired by its title. Save and done, or keep going.',
    deliverable: '3 screenshots + notes saved to Brand Brain.',
  },
  {
    title: 'One-Take Warmup',
    description: 'Record yourself saying one sentence on camera. That\'s the whole quest.',
    type: 'content_exercise' as const,
    prompt: 'Pick up your phone right now. Open the camera app. Hit record. Say one sentence about what you\'re working on today. Stop recording. That\'s it. The shittier the better. This is about pressing the button, not about quality.',
    category: 'record_button_reps' as const,
    energyTier: 'spark' as const,
    track: 'both' as const,
    xpReward: 5,
    estimatedMinutes: 2,
    whyThisMatters: 'Camera confidence comes from reps, not talent. Every time you press record, the activation barrier gets lower.',
    rescueStatement: "If even one sentence feels like too much, just hit record and say 'testing.' That still counts.",
    deliverable: 'One video clip (not for posting).',
  },
  {
    title: 'Belief Bomb',
    description: 'What do you believe about your space that most people disagree with?',
    type: 'voice_storm_prompt' as const,
    prompt: 'Hit record and talk for 3 minutes about something you believe about your space that goes against the mainstream opinion. Why do you believe it? What experience taught you this? Don\'t filter yourself.',
    category: 'brand_brain_fuel' as const,
    energyTier: 'spark' as const,
    track: 'both' as const,
    xpReward: 8,
    estimatedMinutes: 5,
    whyThisMatters: 'Contrarian beliefs are what separate your content from everyone else covering the same topic. This is brand positioning in action.',
    rescueStatement: "If nothing comes to mind immediately, think about the last thing that annoyed you about your industry. Start there.",
    deliverable: 'Voice memo saved to Brand Brain.',
  },
  {
    title: 'Comment Gold Rush',
    description: 'Mine comments for content ideas your audience is already asking for.',
    type: 'research_task' as const,
    prompt: 'Go to 3 popular videos in your space. Read through the comments for exactly 5 minutes (set a timer). Screenshot every question or frustration you see. Write down a video title that answers each one directly.',
    category: 'scroll_study' as const,
    energyTier: 'flow' as const,
    track: 'both' as const,
    xpReward: 14,
    estimatedMinutes: 12,
    whyThisMatters: 'Your audience is literally telling creators what they want in the comments. Most people just aren\'t listening.',
    rescueStatement: "If the comments are boring, switch to a different video. Not every source is gold.",
    bonusRound: 'Got your screenshots? Pick your favorite question and record a 60-second voice memo answering it. Save and done, or keep going.',
    deliverable: 'Screenshots + video title ideas saved to Brand Brain.',
  },
  {
    title: 'Hook Knockout',
    description: 'Write one hook. Just one. Make it hit.',
    type: 'content_exercise' as const,
    prompt: 'Pick any video idea you\'ve been thinking about. Write one opening hook: the first sentence a viewer would hear. Use 10 words or fewer. Make it impossible to scroll past.',
    category: 'hook_gym' as const,
    energyTier: 'spark' as const,
    track: 'both' as const,
    xpReward: 7,
    estimatedMinutes: 3,
    whyThisMatters: 'Hooks are the 80/20 of content performance. One great opening line can make the difference between 100 views and 10,000.',
    rescueStatement: "Writer's block on hooks is normal. Just write the worst hook you can think of first. Seriously. Then flip it.",
    bonusRound: 'Wrote your one hook? Try writing 4 more using different techniques: question, bold claim, story opener, controversy. Save and done, or keep going.',
    deliverable: 'Written hook(s) saved to Brand Brain.',
  },
  {
    title: 'Audience Day-in-the-Life',
    description: 'Walk through your ideal viewer\'s typical day. What frustrates them? What do they dream about?',
    type: 'voice_storm_prompt' as const,
    prompt: 'Record yourself describing your ideal viewer\'s day. What do they do for work? What frustrates them right now? What content do they consume? What would make their life easier? The more specific you get, the better.',
    category: 'brand_brain_fuel' as const,
    energyTier: 'flow' as const,
    track: 'both' as const,
    xpReward: 12,
    estimatedMinutes: 10,
    whyThisMatters: 'The more specific you can describe your audience, the better every piece of content will resonate. Empathy is a content superpower.',
    rescueStatement: "If you don't know your ideal viewer well yet, describe the version of you from 2 years ago instead.",
    deliverable: 'Voice memo saved to Brand Brain.',
  },
  {
    title: 'Hook Remix Challenge',
    description: 'Take a hook that already works and rewrite it 3 different ways.',
    type: 'content_exercise' as const,
    prompt: 'Find one video in your space with a great hook (first 3 seconds). Write down exactly what they said. Now rewrite that hook 3 different ways for YOUR content. Keep each version under 15 words.',
    category: 'hook_gym' as const,
    energyTier: 'flow' as const,
    track: 'both' as const,
    xpReward: 13,
    estimatedMinutes: 12,
    whyThisMatters: 'Rewriting existing hooks builds pattern recognition faster than writing from scratch. You learn what works by remixing what already works.',
    rescueStatement: "If you can't find a great hook, just pick any video and rewrite its opening. Practice beats perfection.",
    bonusRound: 'Got your 3 rewrites? Record yourself delivering the best one on camera. Save and done, or keep going.',
    deliverable: '3 hook rewrites saved to Brand Brain.',
  },
  {
    title: 'Thumbnail Pattern Scan',
    description: 'Study top-performing thumbnails and find the patterns hiding in plain sight.',
    type: 'research_task' as const,
    prompt: 'Screenshot the thumbnails of 5 top-performing videos in your space from the past month. Lay them out and answer: What colors dominate? How many use faces? How much text? Write down 3 thumbnail rules for your content based on what you see. Time limit: 15 minutes.',
    category: 'scroll_study' as const,
    energyTier: 'flow' as const,
    track: 'long_form' as const,
    xpReward: 16,
    estimatedMinutes: 15,
    whyThisMatters: 'Thumbnail patterns are niche-specific. Studying what works in your space gives you a visual playbook that applies to every video you make.',
    rescueStatement: "If 5 thumbnails feels like too many, do 3. The pattern usually shows up by the third one.",
    deliverable: 'Screenshots + 3 thumbnail rules saved to Brand Brain.',
  },
];

// GET /api/side-quests — List side quests with optional completion filter
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const userId = user.id;

    const completed = request.nextUrl.searchParams.get('completed');

    const filter: Record<string, unknown> = { userId };
    if (completed === 'true') filter.completed = true;
    if (completed === 'false') filter.completed = false;

    const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);

    const [quests, total] = await Promise.all([
      SideQuest.find(filter)
        .sort({ completed: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SideQuest.countDocuments(filter),
    ]);

    return NextResponse.json(paginationResponse(quests, total, page, limit));
  } catch (error) {
    console.error('Error fetching side quests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/side-quests — Generate new AI-powered side quests (3 of mixed types)
export async function POST(request: NextRequest) {
  try {
    const rl = aiLimiter.check(getRateLimitKey(request, 'side-quests'));
    if (!rl.success) return rateLimitResponse(rl.resetIn);

    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const userId = user.id;

    // Fetch existing quest titles to avoid duplicates
    const existingQuests = await SideQuest.find({ userId })
      .select('title')
      .lean();
    const existingTitles = existingQuests.map((q) => q.title);

    // Gather context for framework v2
    const recentQuests = await SideQuest.find({ userId })
      .sort({ createdAt: -1 })
      .limit(4)
      .select('category')
      .lean();
    const recentCategories = recentQuests
      .map((q) => (q as { category?: string }).category)
      .filter(Boolean) as string[];

    // Check last activity for state-sensitive delivery
    const UserXP = (await import('@/models/UserXP')).default;
    const userXP = await UserXP.findOne({ userId }).lean();
    let daysSinceLastActivity: number | undefined;
    if (userXP && (userXP as { lastActiveDate?: Date }).lastActiveDate) {
      const ms = Date.now() - new Date((userXP as { lastActiveDate: Date }).lastActiveDate).getTime();
      daysSinceLastActivity = Math.floor(ms / (1000 * 60 * 60 * 24));
    }

    // Get current program week
    const User = (await import('@/models/User')).default;
    const userData = await User.findById(userId).select('currentWeekNumber').lean();
    const currentWeek = (userData as { currentWeekNumber?: number } | null)?.currentWeekNumber;

    // Attempt AI generation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let questData: any[];

    try {
      // Assemble Brand Brain context (include tone of voice + pillars + industry, skip equipment/transcripts for speed)
      const brandBrainContext = await assembleBrandBrainContext(userId, {
        includeToneOfVoice: true,
        includeContentPillars: true,
        includeIndustryData: true,
        includeEquipmentProfile: false,
        includeTranscripts: false,
      });

      const generated = await generateSideQuests(brandBrainContext, existingTitles, userId, {
        currentWeek,
        recentCategories,
        daysSinceLastActivity,
      });
      questData = generated;
    } catch (aiError) {
      console.error('AI side quest generation failed, falling back to mock data:', aiError);

      // FALLBACK: pick 3 random mock quests (one of each type)
      const shuffled = [...MOCK_QUESTS].sort(() => Math.random() - 0.5);
      const selected: (typeof MOCK_QUESTS)[number][] = [];
      const types = new Set<string>();

      for (const quest of shuffled) {
        if (selected.length >= 3) break;
        if (!types.has(quest.type)) {
          types.add(quest.type);
          selected.push(quest);
        }
      }
      for (const quest of shuffled) {
        if (selected.length >= 3) break;
        if (!selected.includes(quest)) {
          selected.push(quest);
        }
      }

      questData = selected;
    }

    // Create in DB
    const created = await SideQuest.insertMany(
      questData.map((q) => ({
        userId,
        title: q.title,
        description: q.description,
        type: q.type,
        prompt: q.prompt,
        xpReward: q.xpReward,
        estimatedMinutes: q.estimatedMinutes,
        category: ('category' in q && q.category) || 'brand_brain_fuel',
        energyTier: ('energyTier' in q && q.energyTier) || 'flow',
        motivationDriver: 'motivationDriver' in q ? q.motivationDriver : undefined,
        track: ('track' in q && q.track) || 'both',
        whyThisMatters: 'whyThisMatters' in q ? q.whyThisMatters : undefined,
        rescueStatement: 'rescueStatement' in q ? q.rescueStatement : undefined,
        bonusRound: 'bonusRound' in q ? q.bonusRound : undefined,
        deliverable: 'deliverable' in q ? q.deliverable : undefined,
        completed: false,
      }))
    );

    // Fire-and-forget notification that new side quests are available
    createNotification({
      userId,
      type: 'quest_available',
      title: 'New side quests available',
      message: `${created.length} new side quest${created.length === 1 ? '' : 's'} are ready for you!`,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error generating side quests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
