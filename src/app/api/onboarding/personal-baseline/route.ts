import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import PersonalBaseline from '@/models/PersonalBaseline';
import { getAuthenticatedUser } from '@/lib/api-auth';

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
