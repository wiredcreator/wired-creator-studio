import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
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
    const { transcript, callType, destination, inputType, skipAiProcessing, skipXp } = body;

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

    // Resolve destination: 'ideas' | 'brand_brain' | 'both' (default)
    const validDestinations = ['ideas', 'brand_brain', 'both'];
    const resolvedDestination = validDestinations.includes(destination)
      ? destination
      : 'both';

    const shouldExtractIdeas = resolvedDestination === 'ideas' || resolvedDestination === 'both';
    const shouldSaveToBrandBrain = resolvedDestination === 'brand_brain' || resolvedDestination === 'both';

    const validInputTypes = ['written', 'voice', 'file_upload'];
    const resolvedInputType = validInputTypes.includes(inputType) ? inputType : 'written';

    // Save the transcript record (always — so it shows in brain dump history)
    const callTranscript = await CallTranscript.create({
      userId,
      source: 'manual',
      callType: resolvedCallType,
      transcript,
      inputType: resolvedInputType,
      callDate: new Date(),
      extractedIdeas: [],
      extractedStories: [],
      extractedThemes: [],
      ingestedIntoBrandBrain: false,
    });

    let extracted = { contentIdeas: [] as { title: string; description: string; contentPillar?: string }[], stories: [] as { summary: string; fullText: string }[], themes: [] as { theme: string }[] };
    const savedIdeas = [];

    if (!skipAiProcessing && shouldExtractIdeas) {
      // Fetch the user's content pillars from Brand Brain
      let contentPillars: string[] = [];
      const brandBrain = await BrandBrain.findOne({ userId }).lean();
      if (brandBrain && brandBrain.contentPillars) {
        contentPillars = brandBrain.contentPillars.map(
          (p: { title: string }) => p.title
        );
      }

      // Process the transcript with AI
      extracted = await processBrainDump(transcript, contentPillars, userId);

      // Save extracted ideas to ContentIdea model
      for (const idea of extracted.contentIdeas) {
        const resources = idea.description ? [{
          type: 'text',
          source: 'written',
          name: 'AI-generated concept brief',
          content: idea.description,
        }] : [];
        const contentIdea = await ContentIdea.create({
          userId,
          title: idea.title,
          description: idea.description,
          status: 'suggested',
          source: 'brain_dump',
          contentPillar: idea.contentPillar,
          tags: [],
          resources,
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
    }

    // --- Write back to Brand Brain ---
    if (!skipAiProcessing && shouldSaveToBrandBrain) {
      callTranscript.ingestedIntoBrandBrain = true;
      try {
        await BrandBrain.findOneAndUpdate(
          { userId },
          { $addToSet: { callTranscripts: callTranscript._id } }
        );
      } catch (bbError) {
        // Non-fatal: brain dump processing succeeded even if Brand Brain link fails
        console.error('[BrainDump] Brand Brain write-back failed (non-fatal):', bbError);
      }
    }

    await callTranscript.save();

    // Fire-and-forget XP award (skip if voice-storming already handles XP)
    if (!skipXp) {
      awardXP(userId, 'brain_dump', { sessionId: callTranscript._id.toString() }).catch((err) =>
        console.error('[XP] Failed to award brain_dump XP:', err)
      );
    }

    return NextResponse.json(
      {
        session: callTranscript,
        extracted,
        savedIdeas,
        destination: resolvedDestination,
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

    // Admins can look up any student's brain dumps via ?userId=
    let userId = user.id;
    const requestedUserId = request.nextUrl.searchParams.get('userId');
    if (requestedUserId && (user.role === 'admin')) {
      userId = requestedUserId;
    }

    const searchParams = request.nextUrl.searchParams;
    const filter: Record<string, unknown> = { userId };
    const { page, limit, skip } = parsePagination(searchParams);

    // Tag filter
    const tagFilter = searchParams.get('tag');
    if (tagFilter) {
      filter.tags = tagFilter;
    }

    // Sort options: newest (default), oldest, priority
    const sortParam = searchParams.get('sort') || 'newest';
    let sortObj: Record<string, 1 | -1>;
    if (sortParam === 'oldest') {
      sortObj = { createdAt: 1 };
    } else if (sortParam === 'priority') {
      // Custom sort: high=0, medium=1, low=2 — we use a collation trick
      // Since mongo doesn't natively sort enums, we'll do it in aggregation
      // For simplicity, fetch all then sort client-side... but better:
      // high first, then medium, then low, each sub-sorted by newest
      sortObj = { createdAt: -1 }; // fallback, real priority sort done below
    } else {
      sortObj = { createdAt: -1 };
    }

    if (sortParam === 'priority') {
      // Use aggregation for priority sorting — convert userId to ObjectId for aggregation
      const aggFilter = { ...filter, userId: new mongoose.Types.ObjectId(userId) };
      const pipeline = [
        { $match: aggFilter },
        {
          $addFields: {
            priorityOrder: {
              $switch: {
                branches: [
                  { case: { $eq: ['$priority', 'high'] }, then: 0 },
                  { case: { $eq: ['$priority', 'medium'] }, then: 1 },
                  { case: { $eq: ['$priority', 'low'] }, then: 2 },
                ],
                default: 1,
              },
            },
          },
        },
        { $sort: { priorityOrder: 1 as const, createdAt: -1 as const } },
        { $skip: skip },
        { $limit: limit },
        { $project: { priorityOrder: 0 } },
      ];

      const [sessions, total] = await Promise.all([
        CallTranscript.aggregate(pipeline),
        CallTranscript.countDocuments(filter), // Mongoose .find() auto-casts userId
      ]);

      return NextResponse.json(paginationResponse(sessions, total, page, limit));
    }

    const [sessions, total] = await Promise.all([
      CallTranscript.find(filter)
        .sort(sortObj)
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
