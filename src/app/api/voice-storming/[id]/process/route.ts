import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import VoiceStormingTranscript from '@/models/VoiceStormingTranscript';
import BrandBrain from '@/models/BrandBrain';
import ContentIdea from '@/models/ContentIdea';
import { processVoiceStorming, generateSessionTitle } from '@/lib/ai/generate';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validateObjectId } from '@/lib/validation';
import { aiLimiter, getRateLimitKey, rateLimitResponse } from '@/lib/rate-limit';

// POST /api/voice-storming/[id]/process — Run AI processing on a voice storm session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = aiLimiter.check(getRateLimitKey(request, 'voice-storm-process'));
    if (!rl.success) return rateLimitResponse(rl.resetIn);

    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { id } = await params;
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

    const session = await VoiceStormingTranscript.findById(id);
    if (!session) {
      return NextResponse.json(
        { error: 'Voice storming session not found' },
        { status: 404 }
      );
    }

    const isOwner = session.userId.toString() === user.id;
    const isPrivileged = user.role === 'admin';

    if (!isOwner && !isPrivileged) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (!session.transcript || session.transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'No transcript text to process. Add a transcript first.' },
        { status: 422 }
      );
    }

    // Concurrent processing guard
    const thirtySecondsAgo = new Date(Date.now() - 30000);
    if (session.extractedInsights.length > 0 && session.updatedAt > thirtySecondsAgo) {
      return NextResponse.json(
        { error: 'Session was recently processed. Please wait before re-processing.' },
        { status: 409 }
      );
    }

    // Get content pillars from Brand Brain
    let contentPillars: string[] = [];
    const brandBrain = await BrandBrain.findOne({ userId: session.userId }).lean();
    if (brandBrain?.contentPillars) {
      contentPillars = brandBrain.contentPillars.map((p: { title: string }) => p.title);
    }

    // Process with AI
    const result = await processVoiceStorming(session.transcript, contentPillars, user.id);

    // Map to extractedInsights schema with contentPillar from AI
    const insights = [
      ...result.contentIdeas.map((item) => ({
        type: 'idea' as const,
        content: item.content,
        contentPillar: item.contentPillar,
      })),
      ...result.personalStories.map((item) => ({
        type: 'story' as const,
        content: item.content,
        contentPillar: item.contentPillar,
      })),
      ...result.keyThemes.map((item) => ({
        type: 'theme' as const,
        content: item.content,
        contentPillar: item.contentPillar,
      })),
      ...result.actionItems.map((item) => ({
        type: 'action_item' as const,
        content: item.content,
        contentPillar: item.contentPillar,
      })),
    ];

    session.extractedInsights = insights;

    // Generate title (independent — failure doesn't block insights)
    const title = await generateSessionTitle(session.transcript, user.id);
    session.title = title;

    await session.save();

    // --- Comprehensive Brand Brain Ingest (non-fatal) ---
    let savedIdeas: InstanceType<typeof ContentIdea>[] = [];
    try {
      const userId = session.userId;

      // 1. Save content ideas as ContentIdea documents (source: 'voice_storm')
      for (const idea of result.contentIdeas) {
        const contentIdea = await ContentIdea.create({
          userId,
          title: idea.content,
          description: '',
          status: 'suggested',
          source: 'voice_storm',
          contentPillar: idea.contentPillar,
          sourceSessionId: session._id,
          tags: [],
        });
        savedIdeas.push(contentIdea);
      }

      // Link saved idea IDs back to the voice storm session
      if (savedIdeas.length > 0) {
        const ideaIds = savedIdeas.map((i) => i._id);
        await VoiceStormingTranscript.findByIdAndUpdate(session._id, {
          $addToSet: { linkedIdeaIds: { $each: ideaIds } },
        });
      }

      // 2. Write back to Brand Brain — session link + idea links + theme keywords
      const bbUpdate: Record<string, unknown> = {};
      const addToSetOps: Record<string, unknown> = {
        voiceStormSessions: session._id,
      };

      // Add saved idea refs to Brand Brain approvedIdeas
      if (savedIdeas.length > 0) {
        addToSetOps.approvedIdeas = { $each: savedIdeas.map((i) => i._id) };
      }

      bbUpdate.$addToSet = addToSetOps;

      await BrandBrain.findOneAndUpdate({ userId }, bbUpdate);

      // 3. Enrich content pillar keywords with extracted themes
      if (result.keyThemes.length > 0 && brandBrain?.contentPillars?.length) {
        for (const theme of result.keyThemes) {
          if (!theme.contentPillar) continue;
          // Find the matching pillar index
          const pillarIdx = brandBrain.contentPillars.findIndex(
            (p: { title: string }) =>
              p.title.toLowerCase() === theme.contentPillar.toLowerCase()
          );
          if (pillarIdx !== -1) {
            // Add the theme content as a keyword on the matching pillar (deduplicated)
            await BrandBrain.findOneAndUpdate(
              { userId },
              {
                $addToSet: {
                  [`contentPillars.${pillarIdx}.keywords`]: theme.content,
                },
              }
            );
          }
        }
      }
    } catch (bbError) {
      // Non-fatal: AI processing succeeded even if Brand Brain ingest fails
      console.error('[VoiceStorm] Brand Brain ingest failed (non-fatal):', bbError);
    }

    return NextResponse.json({
      success: true,
      session,
      extracted: result,
      savedIdeas,
    });
  } catch (error) {
    console.error('Error processing voice storm:', error);
    return NextResponse.json(
      { error: 'Failed to process voice storming session' },
      { status: 500 }
    );
  }
}
