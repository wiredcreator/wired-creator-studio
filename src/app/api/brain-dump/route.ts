import { NextRequest, NextResponse } from 'next/server';
import { aiLimiter, getRateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import dbConnect from '@/lib/db';
import CallTranscript from '@/models/CallTranscript';
import ContentIdea from '@/models/ContentIdea';
import BrandBrain from '@/models/BrandBrain';
import { processBrainDump } from '@/lib/ai/generate';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { parsePagination, paginationResponse } from '@/lib/pagination';
import { awardXP } from '@/lib/xp-service';

// POST /api/brain-dump — Submit a brain dump transcript for processing
export async function POST(request: NextRequest) {
  try {
    const rl = aiLimiter.check(getRateLimitKey(request, 'brain-dump'));
    if (!rl.success) return rateLimitResponse(rl.resetIn);

    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const body = await request.json();
    const { transcript, callType } = body;

    if (!transcript) {
      return NextResponse.json(
        { error: 'transcript is required' },
        { status: 400 }
      );
    }

    const userId = user.id;

    const validCallTypes = ['1on1_coaching', 'brain_dump', 'support', 'other'];
    const resolvedCallType = validCallTypes.includes(callType)
      ? callType
      : 'brain_dump';

    // Save the transcript
    const callTranscript = await CallTranscript.create({
      userId,
      source: 'manual',
      callType: resolvedCallType,
      transcript,
      callDate: new Date(),
      extractedIdeas: [],
      extractedStories: [],
      extractedThemes: [],
      ingestedIntoBrandBrain: false,
    });

    // Fetch the user's content pillars from Brand Brain
    let contentPillars: string[] = [];
    const brandBrain = await BrandBrain.findOne({ userId }).lean();
    if (brandBrain && brandBrain.contentPillars) {
      contentPillars = brandBrain.contentPillars.map(
        (p: { title: string }) => p.title
      );
    }

    // Process the transcript with AI
    const extracted = await processBrainDump(transcript, contentPillars);

    // Save extracted ideas to ContentIdea model
    const savedIdeas = [];
    for (const idea of extracted.contentIdeas) {
      const contentIdea = await ContentIdea.create({
        userId,
        title: idea.title,
        description: idea.description,
        status: 'suggested',
        source: 'brain_dump',
        contentPillar: idea.contentPillar,
        tags: [],
      });
      savedIdeas.push(contentIdea);
    }

    // Update the CallTranscript with extracted data
    callTranscript.extractedIdeas = extracted.contentIdeas.map((idea) => ({
      title: idea.title,
      description: idea.description,
    }));
    callTranscript.extractedStories = extracted.stories.map((story) => ({
      summary: story.summary,
      fullText: story.fullText,
    }));
    callTranscript.extractedThemes = extracted.themes.map((t) => t.theme);
    callTranscript.ingestedIntoBrandBrain = true;
    await callTranscript.save();

    // --- Write back to Brand Brain ---
    try {
      await BrandBrain.findOneAndUpdate(
        { userId },
        { $addToSet: { callTranscripts: callTranscript._id } }
      );
    } catch (bbError) {
      // Non-fatal: brain dump processing succeeded even if Brand Brain link fails
      console.error('[BrainDump] Brand Brain write-back failed (non-fatal):', bbError);
    }

    // Fire-and-forget XP award
    awardXP(userId, 'brain_dump', { sessionId: callTranscript._id.toString() }).catch((err) =>
      console.error('[XP] Failed to award brain_dump XP:', err)
    );

    return NextResponse.json(
      {
        session: callTranscript,
        extracted,
        savedIdeas,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing brain dump:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/brain-dump — List brain dump sessions for a user
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const userId = user.id;
    const filter = { userId };
    const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);

    const [sessions, total] = await Promise.all([
      CallTranscript.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CallTranscript.countDocuments(filter),
    ]);

    return NextResponse.json(paginationResponse(sessions, total, page, limit));
  } catch (error) {
    console.error('Error fetching brain dump sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
