import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import VoiceStormingTranscript from '@/models/VoiceStormingTranscript';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { parsePagination, paginationResponse } from '@/lib/pagination';
import { awardXP } from '@/lib/xp-service';

// GET /api/voice-storming — List voice-storming transcripts for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    // Coaches/admins can look up any student's voice storming sessions via ?userId=
    let targetUserId = user.id;
    const requestedUserId = searchParams.get('userId');
    if (requestedUserId && (user.role === 'coach' || user.role === 'admin')) {
      targetUserId = requestedUserId;
    }

    // Build filter
    const filter: Record<string, unknown> = { userId: targetUserId };

    // Search
    const search = searchParams.get('search');
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { transcript: { $regex: search, $options: 'i' } },
      ];
    }

    // Filters
    if (searchParams.get('linked') === 'true') {
      filter.linkedIdeaIds = { $exists: true, $ne: [] };
    }
    if (searchParams.get('hasIdeas') === 'true') {
      filter['extractedInsights.type'] = 'idea';
    }
    if (searchParams.get('hasStories') === 'true') {
      filter['extractedInsights.type'] = 'story';
    }
    if (searchParams.get('hasThemes') === 'true') {
      filter['extractedInsights.type'] = 'theme';
    }
    if (searchParams.get('hasActions') === 'true') {
      filter['extractedInsights.type'] = 'action_item';
    }

    const [transcripts, total] = await Promise.all([
      VoiceStormingTranscript.find(filter)
        .select('_id title transcript sessionType promptUsed duration linkedIdeaIds extractedInsights createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      VoiceStormingTranscript.countDocuments(filter),
    ]);

    return NextResponse.json(paginationResponse(transcripts, total, page, limit));
  } catch (error) {
    console.error('Error fetching voice-storming transcripts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/voice-storming — Create a new voice-storming transcript
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const body = await request.json();
    const {
      transcript,
      sessionType = 'freeform',
      linkedIdeaIds,
      audioUrl,
      duration = 0,
      promptUsed,
    } = body;

    if (!transcript || typeof transcript !== 'string' || transcript.trim() === '') {
      return NextResponse.json(
        { error: 'transcript is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const newTranscript = await VoiceStormingTranscript.create({
      userId: user.id,
      transcript,
      sessionType,
      linkedIdeaIds,
      audioUrl,
      duration,
      promptUsed,
      extractedInsights: [],
    });

    // Fire-and-forget XP award
    awardXP(user.id, 'voice_storm', { transcriptId: newTranscript._id.toString() }).catch((err) =>
      console.error('[XP] Failed to award voice_storm XP:', err)
    );

    return NextResponse.json(newTranscript, { status: 201 });
  } catch (error) {
    console.error('Error creating voice-storming transcript:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
