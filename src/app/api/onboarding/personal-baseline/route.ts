import { NextRequest, NextResponse } from 'next/server';
import { aiLimiter, getRateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import dbConnect from '@/lib/db';
import PersonalBaseline from '@/models/PersonalBaseline';
import ContentDNAResponse from '@/models/ContentDNAResponse';
import BrandBrain from '@/models/BrandBrain';
import User from '@/models/User';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { processPersonalBaseline } from '@/lib/ai/generate';

interface PersonalBaselinePayload {
  responses: {
    questionId: string;
    question: string;
    answer: string;
  }[];
  browserTimezone?: string;
}

function validatePayload(data: PersonalBaselinePayload): string | null {
  if (!Array.isArray(data.responses) || data.responses.length === 0) {
    return 'Responses are required.';
  }

  for (const r of data.responses) {
    if (!r.questionId || !r.question) {
      return 'Each response must have a questionId and question.';
    }
  }

  return null;
}

const STATE_TO_TIMEZONE: Record<string, string> = {
  CT: 'America/New_York', DE: 'America/New_York', DC: 'America/New_York',
  FL: 'America/New_York', GA: 'America/New_York', IN: 'America/Indiana/Indianapolis',
  KY: 'America/New_York', ME: 'America/New_York', MD: 'America/New_York',
  MA: 'America/New_York', MI: 'America/New_York', NH: 'America/New_York',
  NJ: 'America/New_York', NY: 'America/New_York', NC: 'America/New_York',
  OH: 'America/New_York', PA: 'America/New_York', RI: 'America/New_York',
  SC: 'America/New_York', TN: 'America/New_York', VT: 'America/New_York',
  VA: 'America/New_York', WV: 'America/New_York',
  AL: 'America/Chicago', AR: 'America/Chicago', IL: 'America/Chicago',
  IA: 'America/Chicago', KS: 'America/Chicago', LA: 'America/Chicago',
  MN: 'America/Chicago', MS: 'America/Chicago', MO: 'America/Chicago',
  NE: 'America/Chicago', ND: 'America/Chicago', OK: 'America/Chicago',
  SD: 'America/Chicago', TX: 'America/Chicago', WI: 'America/Chicago',
  AZ: 'America/Phoenix', CO: 'America/Denver', ID: 'America/Boise',
  MT: 'America/Denver', NM: 'America/Denver', UT: 'America/Denver',
  WY: 'America/Denver',
  CA: 'America/Los_Angeles', WA: 'America/Los_Angeles', OR: 'America/Los_Angeles',
  NV: 'America/Los_Angeles',
  AK: 'America/Anchorage',
  HI: 'Pacific/Honolulu',
};

export async function POST(request: NextRequest) {
  try {
    const rl = aiLimiter.check(getRateLimitKey(request, 'onboarding-personal-baseline'));
    if (!rl.success) return rateLimitResponse(rl.resetIn);

    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult;

    const body: PersonalBaselinePayload = await request.json();

    const validationError = validatePayload(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, message: validationError },
        { status: 400 }
      );
    }

    await dbConnect();

    // Upsert: update if the user already submitted, otherwise create
    const baseline = await PersonalBaseline.findOneAndUpdate(
      { userId: user.id },
      {
        userId: user.id,
        responses: body.responses,
        completedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Extract city and state from responses and derive timezone
    const cityResponse = body.responses.find((r) => r.questionId === 'location-city');
    const stateResponse = body.responses.find((r) => r.questionId === 'location-state');
    const city = cityResponse?.answer?.trim() || '';
    const stateAbbr = stateResponse?.answer?.trim().toUpperCase() || '';
    // Prefer the browser's detected timezone, fall back to state-based derivation
    const derivedTimezone = body.browserTimezone || STATE_TO_TIMEZONE[stateAbbr] || 'America/New_York';

    // Mark personal baseline as completed on the user + save location/timezone
    await User.findByIdAndUpdate(user.id, {
      personalBaselineCompleted: true,
      city,
      state: stateAbbr,
      timezone: derivedTimezone,
    });

    // --- Respond immediately — don't block on AI processing ---
    const userId = user.id;

    // Fire off AI profile processing in the background (non-blocking)
    (async () => {
      try {
        await dbConnect();

        // Build baseline responses for AI
        const baselineResponses = body.responses.map((r) => ({
          question: r.question,
          answer: r.answer,
        }));

        // Fetch Content DNA responses for fuller context (if available)
        let contentDNAResponses: { question: string; answer: string | string[] }[] | undefined;
        try {
          const contentDNA = await ContentDNAResponse.findOne({ userId }).lean();
          if (contentDNA && contentDNA.responses) {
            contentDNAResponses = contentDNA.responses.map((r: { question: string; answer: string | string[] }) => ({
              question: r.question,
              answer: r.answer,
            }));
          }
        } catch (dnaError) {
          console.error('[PersonalBaseline] Failed to fetch Content DNA (non-fatal):', dnaError);
        }

        // Call AI to process baseline
        const result = await processPersonalBaseline(baselineResponses, contentDNAResponses, userId);

        // Update User document with generated profile fields
        const userUpdate: Record<string, unknown> = {
          background: result.background,
          neurodivergentProfile: result.neurodivergentProfile,
          contentGoals: result.contentGoals,
          riskFlags: result.riskFlags,
        };
        await User.findByIdAndUpdate(userId, { $set: userUpdate });

        // If equipment info was extracted, update BrandBrain
        if (result.equipmentProfile) {
          try {
            await BrandBrain.findOneAndUpdate(
              { userId },
              { $set: { equipmentProfile: result.equipmentProfile } }
            );
          } catch (bbError) {
            console.error('[PersonalBaseline] BrandBrain equipment update failed (non-fatal):', bbError);
          }
        }

        console.log('[PersonalBaseline] AI profile processing completed successfully in background');
      } catch (aiError) {
        console.error(
          '[PersonalBaseline] AI profile processing failed (non-fatal):',
          aiError
        );
      }
    })();

    return NextResponse.json({
      success: true,
      message: 'Personal Baseline saved',
      data: { id: baseline._id.toString() },
    });
  } catch (error) {
    console.error('Error saving Personal Baseline:', error);
    return NextResponse.json(
      { success: false, message: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult;

    await dbConnect();

    const baseline = await PersonalBaseline.findOne({ userId: user.id }).lean();

    if (!baseline) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: baseline,
    });
  } catch (error) {
    console.error('Error fetching Personal Baseline:', error);
    return NextResponse.json(
      { success: false, message: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
