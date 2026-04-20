import { NextRequest, NextResponse } from 'next/server';
import { aiLimiter, getRateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import dbConnect from '@/lib/db';
import ContentIdea from '@/models/ContentIdea';
import BrandBrain from '@/models/BrandBrain';

export const maxDuration = 60; // seconds - AI idea generation can take a while
import { assembleBrandBrainContext } from '@/lib/ai/brand-brain-context';
import { generateIdeas } from '@/lib/ai/generate';
import { getIdeaPatterns } from '@/lib/ai/idea-patterns';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { createNotification } from '@/lib/notifications';

// POST /api/ideas/generate — Generate new AI content ideas for a user
export async function POST(request: NextRequest) {
  try {
    const rl = aiLimiter.check(getRateLimitKey(request, 'ideas-generate'));
    if (!rl.success) return rateLimitResponse(rl.resetIn);

    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    // Allow admins to generate ideas on behalf of a student
    const body = await request.json().catch(() => ({}));
    let targetUserId = user.id;
    const isAdminProxy = user.role === 'admin' && body.studentId;
    if (isAdminProxy) {
      targetUserId = body.studentId;
    }

    // Guard: ensure the target user has completed onboarding with a Brand Brain
    const brandBrain = await BrandBrain.findOne({ userId: targetUserId }).lean();

    if (!brandBrain) {
      return NextResponse.json(
        {
          error:
            'Please complete your onboarding questionnaire before generating ideas. Your Brand Brain needs context about you to generate relevant ideas.',
        },
        { status: 422 }
      );
    }

    if (!brandBrain.contentPillars || brandBrain.contentPillars.length === 0) {
      return NextResponse.json(
        {
          error:
            'Student needs content pillars first. The Content DNA questionnaire must be completed before generating ideas.',
        },
        { status: 422 }
      );
    }

    // Assemble Brand Brain context for idea generation
    const brandBrainContext = await assembleBrandBrainContext(targetUserId, {
      includeToneOfVoice: true,
      includeContentPillars: true,
      includeIndustryData: true,
      includeEquipmentProfile: false,
      includeTranscripts: false,
    });

    // Fetch approval/rejection patterns to improve idea relevance
    const patternsContext = await getIdeaPatterns(targetUserId);

    // Generate ideas via AI (or mock data)
    const generatedIdeas = await generateIdeas(brandBrainContext, undefined, patternsContext, targetUserId);

    // Save all generated ideas to MongoDB
    const savedIdeas = await ContentIdea.insertMany(
      generatedIdeas.map((idea) => ({
        userId: targetUserId,
        title: idea.title,
        description: idea.description,
        status: 'suggested',
        source: 'ai_generated',
        contentPillar: idea.contentPillar || '',
        tags: [],
      }))
    );

    // Notify the student when an admin generates ideas on their behalf
    if (isAdminProxy) {
      createNotification({
        userId: targetUserId,
        type: 'system',
        title: 'New ideas generated',
        message: 'Your coach generated new content ideas for you.',
      });
    }

    return NextResponse.json(
      {
        success: true,
        ideas: savedIdeas,
        count: savedIdeas.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error generating ideas:', error);
    return NextResponse.json(
      { error: 'Failed to generate ideas' },
      { status: 500 }
    );
  }
}
