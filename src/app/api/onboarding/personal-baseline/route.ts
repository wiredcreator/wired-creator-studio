import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
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

    // Mark personal baseline as completed on the user
    await User.findByIdAndUpdate(user.id, { personalBaselineCompleted: true });

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
