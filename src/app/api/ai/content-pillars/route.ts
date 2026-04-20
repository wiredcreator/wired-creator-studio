import { NextRequest, NextResponse } from 'next/server';
import { aiLimiter, getRateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { generateContentPillars } from '@/lib/ai/generate';
import dbConnect from '@/lib/db';
import ContentDNAResponse from '@/models/ContentDNAResponse';
import BrandBrain from '@/models/BrandBrain';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const maxDuration = 60;

// ---------------------------------------------------------------------------
// POST /api/ai/content-pillars
//
// Regenerates content pillars from the user's Content DNA questionnaire
// responses. Updates the Brand Brain document with the new pillars.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const rl = aiLimiter.check(getRateLimitKey(req, 'content-pillars'));
    if (!rl.success) return rateLimitResponse(rl.resetIn) as NextResponse;

    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    // Find the user's Content DNA responses
    const contentDNA = await ContentDNAResponse.findOne({ userId: user.id })
      .sort({ createdAt: -1 })
      .lean();

    if (!contentDNA || !contentDNA.responses || contentDNA.responses.length === 0) {
      return NextResponse.json(
        { error: 'No Content DNA responses found. Please complete the Content DNA questionnaire first.' },
        { status: 400 }
      );
    }

    // Build the responses array for the generation function
    const pillarResponses = contentDNA.responses.map((r: { question: string; answer: string | string[] }) => ({
      question: r.question,
      answer: r.answer,
    }));

    // Generate content pillars via Claude
    const generatedPillars = await generateContentPillars(pillarResponses, user.id);

    // Update Brand Brain with the new pillars
    const updatedBrandBrain = await BrandBrain.findOneAndUpdate(
      { userId: user.id },
      { $set: { contentPillars: generatedPillars } },
      { new: true }
    );

    if (!updatedBrandBrain) {
      return NextResponse.json(
        { error: 'Brand Brain not found. Please complete onboarding first.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      contentPillars: generatedPillars,
      message: `Generated ${generatedPillars.length} content pillars successfully.`,
    });
  } catch (error) {
    console.error('[Content Pillars] Generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate content pillars. Please try again.' },
      { status: 500 }
    );
  }
}
