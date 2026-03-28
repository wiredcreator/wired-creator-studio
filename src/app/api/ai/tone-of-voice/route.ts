import { NextRequest, NextResponse } from 'next/server';
import { aiLimiter, getRateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { generateToneOfVoice } from '@/lib/ai/generate';
import dbConnect from '@/lib/db';
import ContentDNAResponse from '@/models/ContentDNAResponse';
import BrandBrain from '@/models/BrandBrain';
import ToneOfVoiceGuide from '@/models/ToneOfVoiceGuide';
import { getAuthenticatedUser } from '@/lib/api-auth';
import type {
  ToneOfVoiceRequest,
  ToneOfVoiceResponse,
  AIErrorResponse,
} from '@/types/ai';

// ---------------------------------------------------------------------------
// POST /api/ai/tone-of-voice
//
// Accepts either a contentDNAResponseId (to load persisted questionnaire data)
// or raw responses / content samples directly. Calls Claude to generate a
// structured Tone of Voice Guide.
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest
): Promise<NextResponse> {
  try {
    const rl = aiLimiter.check(getRateLimitKey(req, 'tone-of-voice'));
    if (!rl.success) return rateLimitResponse(rl.resetIn) as NextResponse;

    // --- Auth guard ---
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;

    // --- Parse request body ---
    const body: ToneOfVoiceRequest = await req.json();

    // --- Resolve content DNA data ---
    let responses: ToneOfVoiceRequest['rawResponses'] = body.rawResponses;
    let contentSamples = body.contentSamples;
    let creatorExamples = body.creatorExamples;

    // If a persisted ContentDNAResponse ID was provided, load it from the DB
    if (body.contentDNAResponseId) {
      await dbConnect();

      const dnaDoc = await ContentDNAResponse.findById(
        body.contentDNAResponseId
      ).lean();

      if (!dnaDoc) {
        return NextResponse.json(
          {
            success: false,
            error: `ContentDNAResponse not found: ${body.contentDNAResponseId}`,
            code: 'NOT_FOUND',
          },
          { status: 404 }
        );
      }

      // Use persisted data, falling back to any raw data passed in the body
      responses = responses ?? dnaDoc.responses;
      contentSamples = contentSamples ?? dnaDoc.contentSamples;
      creatorExamples = creatorExamples ?? dnaDoc.creatorExamples;
    }

    // Auto-load the user's ContentDNAResponse if no input was provided
    if (!responses || responses.length === 0) {
      await dbConnect();
      const latestDNA = await ContentDNAResponse.findOne({ userId: authResult.id })
        .sort({ createdAt: -1 })
        .lean();
      if (latestDNA) {
        responses = latestDNA.responses;
        contentSamples = contentSamples ?? latestDNA.contentSamples;
        creatorExamples = creatorExamples ?? latestDNA.creatorExamples;
      }
    }

    // Validate that we have at least some input
    if (!responses || responses.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No questionnaire responses provided. Supply either contentDNAResponseId or rawResponses.',
          code: 'MISSING_INPUT',
        },
        { status: 400 }
      );
    }

    // --- Call Claude ---
    const guide = await generateToneOfVoice(
      {
        responses,
        contentSamples,
        creatorExamples,
      },
      body.transcripts,
      authResult.id
    );

    // --- Persist the generated guide to MongoDB ---
    await dbConnect();

    // Resolve the brandBrainId: use what was provided, or look up the user's BrandBrain
    let brandBrainId = body.brandBrainId;
    if (!brandBrainId) {
      const brandBrain = await BrandBrain.findOne({ userId: authResult.id }).select('_id').lean();
      if (brandBrain) {
        brandBrainId = brandBrain._id.toString();
      }
    }

    if (!brandBrainId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No BrandBrain found for this user. Complete onboarding first or provide a brandBrainId.',
          code: 'MISSING_BRAND_BRAIN',
        },
        { status: 400 }
      );
    }

    // Upsert: update existing guide or create a new one
    const savedGuide = await ToneOfVoiceGuide.findOneAndUpdate(
      { userId: authResult.id },
      {
        userId: authResult.id,
        brandBrainId,
        parameters: guide.parameters,
        status: 'draft',
        generatedFrom: {
          questionnaireId: body.contentDNAResponseId || undefined,
          transcriptIds: [],
        },
        $inc: { version: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json(
      { success: true, guide, savedGuideId: savedGuide._id.toString() },
      { status: 200 }
    );
  } catch (error: unknown) {
    // --- Error handling ---
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';

    // Missing API key
    if (message.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service is not configured. Please contact support.',
          code: 'MISSING_API_KEY',
        },
        { status: 503 }
      );
    }

    // Anthropic rate limit (status 429)
    if (message.includes('rate') || message.includes('429')) {
      return NextResponse.json(
        {
          success: false,
          error:
            'AI service is temporarily busy. Please wait a moment and try again.',
          code: 'RATE_LIMIT',
        },
        { status: 429 }
      );
    }

    // Anthropic overloaded (status 529)
    if (message.includes('overloaded') || message.includes('529')) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service is currently overloaded. Please try again later.',
          code: 'OVERLOADED',
        },
        { status: 503 }
      );
    }

    // Generic server error
    console.error('[API] /api/ai/tone-of-voice error:', error);
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
