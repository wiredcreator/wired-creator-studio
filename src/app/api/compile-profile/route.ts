import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { compileStudentProfile } from '@/lib/ai/compile-profile';

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

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error compiling student profile:', error);
    return NextResponse.json(
      { error: 'Failed to compile student profile' },
      { status: 500 }
    );
  }
}
