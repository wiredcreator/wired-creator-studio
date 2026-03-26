import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api-auth';
import ContentScoutSource from '@/models/ContentScoutSource';
import ContentScoutResult from '@/models/ContentScoutResult';
import YouTubeChannelCache from '@/models/YouTubeChannelCache';

// DELETE /api/content-scout/reset — Clear all Content Scout data for this user
export async function DELETE() {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const userId = user.id;

    // Get source URLs for cache cleanup
    const sources = await ContentScoutSource.find({ userId }).lean();
    const channelUrls = sources.map((s) => s.channelUrl);

    // Delete all three collections for this user
    const [sourcesResult, resultsResult] = await Promise.all([
      ContentScoutSource.deleteMany({ userId }),
      ContentScoutResult.deleteMany({ userId }),
      // Clean up channel caches for these URLs
      channelUrls.length > 0
        ? YouTubeChannelCache.deleteMany({ channelUrl: { $in: channelUrls } })
        : Promise.resolve({ deletedCount: 0 }),
    ]);

    return NextResponse.json({
      success: true,
      deleted: {
        sources: sourcesResult.deletedCount,
        results: resultsResult.deletedCount,
      },
    });
  } catch (error) {
    console.error('Error resetting content scout:', error);
    return NextResponse.json(
      { error: 'Failed to reset content scout' },
      { status: 500 }
    );
  }
}
