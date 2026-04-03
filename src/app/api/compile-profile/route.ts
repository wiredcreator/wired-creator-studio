import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { compileStudentProfile } from '@/lib/ai/compile-profile';
import dbConnect from '@/lib/db';
import BrandBrain from '@/models/BrandBrain';

// GET /api/compile-profile?userId=<id>
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId') ?? undefined;

    if (requestedUserId && requestedUserId !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: only admins can view profiles for other users' },
        { status: 403 }
      );
    }

    const targetUserId = requestedUserId ?? user.id;

    await dbConnect();
    const brandBrain = await BrandBrain.findOne({ userId: targetUserId })
      .select('compiledProfile')
      .lean();

    if (!brandBrain || !brandBrain.compiledProfile?.compiledAt) {
      return NextResponse.json({ compiledProfile: null });
    }

    return NextResponse.json({
      compiledProfile: {
        content: brandBrain.compiledProfile.content ?? '',
        compiledAt: brandBrain.compiledProfile.compiledAt,
      },
    });
  } catch (error) {
    console.error('Error fetching compiled profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compiled profile' },
      { status: 500 }
    );
  }
}

// POST /api/compile-profile
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    const body = await request.json().catch(() => ({}));
    const { userId: requestedUserId } = body as { userId?: string };

    // If a userId is explicitly requested, only admins may specify another user
    if (requestedUserId && requestedUserId !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: only admins can compile profiles for other users' },
        { status: 403 }
      );
    }

    const targetUserId = requestedUserId ?? user.id;

    const result = await compileStudentProfile(targetUserId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      compiledProfile: {
        content: result.compiledContent,
        compiledAt: result.compiledAt,
      },
    });
  } catch (error) {
    console.error('Error compiling student profile:', error);
    return NextResponse.json(
      { error: 'Failed to compile student profile' },
      { status: 500 }
    );
  }
}
