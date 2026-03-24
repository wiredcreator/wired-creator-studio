import { NextRequest, NextResponse } from 'next/server';
import { aiLimiter, getRateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import dbConnect from '@/lib/db';
import Script from '@/models/Script';
import ContentIdea from '@/models/ContentIdea';
import VoiceStormingTranscript from '@/models/VoiceStormingTranscript';
import { generateScript } from '@/lib/ai/generate';
import { assembleBrandBrainContext } from '@/lib/ai/brand-brain-context';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { parsePagination, paginationResponse } from '@/lib/pagination';
import { awardXP } from '@/lib/xp-service';

// GET /api/scripts — List scripts with optional status filter
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const userId = user.id;

    const status = request.nextUrl.searchParams.get('status');

    const filter: Record<string, unknown> = { userId };
    if (status) filter.status = status;

    const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);

    const [scripts, total] = await Promise.all([
      Script.find(filter)
        .populate('ideaId', 'title status contentPillar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Script.countDocuments(filter),
    ]);

    return NextResponse.json(paginationResponse(scripts, total, page, limit));
  } catch (error) {
    console.error('Error fetching scripts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/scripts — Generate a new script from an approved idea
export async function POST(request: NextRequest) {
  try {
    const rl = aiLimiter.check(getRateLimitKey(request, 'scripts-generate'));
    if (!rl.success) return rateLimitResponse(rl.resetIn);

    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const body = await request.json();
    const { ideaId, voiceStormTranscriptId } = body;
    const userId = user.id;

    if (!ideaId) {
      return NextResponse.json(
        { error: 'ideaId is required' },
        { status: 400 }
      );
    }

    // Verify the idea exists
    const idea = await ContentIdea.findById(ideaId);
    if (!idea) {
      return NextResponse.json(
        { error: 'Content idea not found' },
        { status: 404 }
      );
    }

    // Assemble Brand Brain context (includes tone of voice guide)
    const brandBrainContext = await assembleBrandBrainContext(userId, {
      includeToneOfVoice: true,
      includeContentPillars: true,
      includeIndustryData: true,
    });

    // Fetch voice storm transcript if one is linked
    let voiceStormTranscript: string | undefined;
    if (voiceStormTranscriptId) {
      try {
        const vsDoc = await VoiceStormingTranscript.findById(voiceStormTranscriptId).lean();
        if (vsDoc && vsDoc.transcript) {
          voiceStormTranscript = vsDoc.transcript;
        }
      } catch {
        // Voice storm fetch is best-effort — continue without it
      }
    }

    // Generate the script using Claude (falls back to mock if no API key)
    const generated = await generateScript(
      idea.title,
      idea.description || '',
      brandBrainContext,
      voiceStormTranscript,
      undefined,
      idea.callToAction || undefined,
    );

    // Save to DB
    const script = await Script.create({
      userId,
      ideaId,
      title: generated.title || idea.title,
      fullScript: generated.fullScript,
      bulletPoints: generated.bulletPoints,
      teleprompterVersion: generated.teleprompterVersion,
      voiceStormTranscriptId: voiceStormTranscriptId || undefined,
      status: 'draft',
      version: 1,
    });

    // Fire-and-forget XP award
    awardXP(userId, 'approve_script', { scriptId: script._id.toString() }).catch((err) =>
      console.error('[XP] Failed to award approve_script XP:', err)
    );

    return NextResponse.json(script, { status: 201 });
  } catch (error) {
    console.error('Error generating script:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
