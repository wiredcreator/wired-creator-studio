import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import PersonalBaseline from '@/models/PersonalBaseline';
import { getAuthenticatedUser } from '@/lib/api-auth';

// GET /api/admin/personal-baseline?userId={id}
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!mongoose.isValidObjectId(userId)) {
      return NextResponse.json(
        { error: 'Invalid userId' },
        { status: 400 }
      );
    }

    await dbConnect();

    const baseline = await PersonalBaseline.findOne({ userId }).lean();

    return NextResponse.json({
      success: true,
      data: baseline || null,
    });
  } catch (error) {
    console.error('Error fetching Personal Baseline for admin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
