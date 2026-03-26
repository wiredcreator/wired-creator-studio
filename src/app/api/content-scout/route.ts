import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api-auth';
import ContentScoutResult from '@/models/ContentScoutResult';

// GET /api/content-scout — Get latest cached Content Scout results
export async function GET() {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const result = await ContentScoutResult.findOne({ userId: user.id })
      .sort({ generatedAt: -1 })
      .lean();

    if (!result) {
      return NextResponse.json({
        videos: [],
        generatedIdeas: [],
        generatedAt: null,
        needsScrape: true,
      });
    }

    return NextResponse.json({
      videos: result.videos,
      generatedIdeas: result.generatedIdeas,
      generatedAt: result.generatedAt,
      needsScrape: false,
    });
  } catch (error) {
    console.error('Error fetching content scout results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content scout results' },
      { status: 500 }
    );
  }
}
