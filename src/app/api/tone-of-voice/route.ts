import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ToneOfVoiceGuide from '@/models/ToneOfVoiceGuide';
import { getAuthenticatedUser } from '@/lib/api-auth';

// GET /api/tone-of-voice — List all Tone of Voice guides
// Students see only their own guides
// Coaches/admins see all, or filter by ?userId=<id>
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');

    const isPrivileged = user.role === 'admin';

    // Build query filter
    let filter: Record<string, string> = {};

    if (isPrivileged) {
      // Coaches/admins can filter by userId or see all
      if (requestedUserId) {
        filter = { userId: requestedUserId };
      }
    } else {
      // Students can only see their own guides
      filter = { userId: user.id };
    }

    const guides = await ToneOfVoiceGuide.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(guides);
  } catch (error) {
    console.error('Error listing Tone of Voice Guides:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
