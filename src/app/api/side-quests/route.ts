import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SideQuest from '@/models/SideQuest';

// Mock side quest data for generation
const MOCK_QUESTS = [
  {
    title: 'Voice Storm: Your Origin Story',
    description: 'Record yourself telling the story of how you got started. No script, no editing — just raw thoughts.',
    type: 'voice_storm_prompt' as const,
    prompt: 'Set a timer for 5 minutes and talk about this: What moment made you decide to start creating content? What were you doing before, and what changed? Don\'t worry about being polished — just talk like you\'re telling a friend over coffee.',
  },
  {
    title: 'Research: What\'s Working in Your Niche',
    description: 'Find 3 videos in your niche that got way more views than usual. Figure out why.',
    type: 'research_task' as const,
    prompt: 'Go to YouTube and find 3 videos in your niche that have significantly more views than the creator\'s average. For each one, write down: (1) The exact title, (2) The thumbnail description, (3) Why you think it performed well, (4) One thing you\'d do differently. This isn\'t about copying — it\'s about understanding patterns.',
  },
  {
    title: 'Exercise: The 60-Second Pitch',
    description: 'Write a 60-second explanation of what your channel is about. Then rewrite it three different ways.',
    type: 'content_exercise' as const,
    prompt: 'Imagine someone at a party asks, "So what\'s your YouTube channel about?" Write your answer in 60 seconds or less. Then rewrite it 3 more times: (1) For someone who has never heard of your niche, (2) For someone who is already an expert, (3) As if you\'re writing a tweet. This helps you find the clearest version of your value proposition.',
  },
  {
    title: 'Voice Storm: Unpopular Opinions',
    description: 'What do you believe about your industry that most people disagree with?',
    type: 'voice_storm_prompt' as const,
    prompt: 'Hit record and talk for 3-5 minutes about something you believe about your industry or niche that goes against the mainstream opinion. Why do you believe it? What experience taught you this? The best content comes from genuine conviction — this exercise helps you find your contrarian edge.',
  },
  {
    title: 'Research: Comment Section Gold',
    description: 'Mine YouTube comments for content ideas your audience is already asking for.',
    type: 'research_task' as const,
    prompt: 'Go to 5 popular videos in your niche and read through the comments. Find 5 questions or frustrations that keep coming up. Write each one down and brainstorm a video title that answers it directly. Your audience is literally telling creators what they want — most people just aren\'t listening.',
  },
  {
    title: 'Exercise: Hook Writing Sprint',
    description: 'Write 10 different hooks for the same video idea. Speed over perfection.',
    type: 'content_exercise' as const,
    prompt: 'Pick any video idea from your pipeline. Set a timer for 10 minutes and write 10 completely different opening hooks (the first 2 sentences of the video). Rules: each hook must use a different technique — question, bold claim, story, statistic, confession, direct address, metaphor, mystery, controversy, or humor. Don\'t judge them yet. Just get 10 on paper.',
  },
  {
    title: 'Voice Storm: Audience Empathy Map',
    description: 'Talk through what your ideal viewer\'s day looks like, what frustrates them, and what they dream about.',
    type: 'voice_storm_prompt' as const,
    prompt: 'Record yourself describing your ideal viewer\'s typical day. What do they do for work? What are they frustrated by right now? What content do they consume? What would make their life easier? What are they secretly hoping to achieve? The more specific you get, the better your content will resonate with real people.',
  },
  {
    title: 'Exercise: Title A/B Testing',
    description: 'Take your last 3 video ideas and write 5 alternative titles for each one.',
    type: 'content_exercise' as const,
    prompt: 'Pull up your last 3 approved video ideas. For each one, write 5 alternative titles using these formats: (1) How-to, (2) Listicle, (3) Challenge/myth-bust, (4) Story-driven, (5) Curiosity gap. Compare them all and pick the one that makes YOU most curious. That\'s usually the winner.',
  },
  {
    title: 'Research: Thumbnail Study',
    description: 'Analyze the top-performing thumbnails in your niche and identify patterns.',
    type: 'research_task' as const,
    prompt: 'Screenshot the thumbnails of the top 10 performing videos in your niche from the past month. Lay them out side by side and answer: (1) What colors dominate? (2) How many use faces? What expressions? (3) How much text is on them? (4) What\'s the visual contrast level? Write down 3 thumbnail rules for your niche based on what you observe.',
  },
];

// GET /api/side-quests — List side quests with optional completion filter
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    const completed = request.nextUrl.searchParams.get('completed');

    const filter: Record<string, unknown> = { userId };
    if (completed === 'true') filter.completed = true;
    if (completed === 'false') filter.completed = false;

    const quests = await SideQuest.find(filter)
      .sort({ completed: 1, createdAt: -1 })
      .lean();

    return NextResponse.json(quests);
  } catch (error) {
    console.error('Error fetching side quests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/side-quests — Generate new side quests (mock AI-generated, 3 of mixed types)
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Pick 3 random quests of mixed types
    const shuffled = [...MOCK_QUESTS].sort(() => Math.random() - 0.5);

    // Try to get one of each type
    const selected: typeof MOCK_QUESTS = [];
    const types = new Set<string>();

    for (const quest of shuffled) {
      if (selected.length >= 3) break;
      if (!types.has(quest.type)) {
        types.add(quest.type);
        selected.push(quest);
      }
    }

    // If we don't have 3 yet, fill from remaining
    for (const quest of shuffled) {
      if (selected.length >= 3) break;
      if (!selected.includes(quest)) {
        selected.push(quest);
      }
    }

    // Create in DB
    const created = await SideQuest.insertMany(
      selected.map((q) => ({
        userId,
        title: q.title,
        description: q.description,
        type: q.type,
        prompt: q.prompt,
        completed: false,
      }))
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error generating side quests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
