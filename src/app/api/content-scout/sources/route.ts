import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api-auth';
import ContentScoutSource from '@/models/ContentScoutSource';
import { resolveChannelId } from '@/lib/youtube-utils';

// GET /api/content-scout/sources — List all sources for the user
export async function GET() {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const sources = await ContentScoutSource.find({ userId: user.id })
      .sort({ addedAt: -1 })
      .lean();

    return NextResponse.json({ sources });
  } catch (error) {
    console.error('Error fetching content scout sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}

// PUT /api/content-scout/sources — Add or remove a source
export async function PUT(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const userId = user.id;
    const body = await request.json();
    const { add, remove } = body as {
      add?: { channelUrl: string; channelName?: string };
      remove?: string;
    };

    if (add) {
      if (!add.channelUrl) {
        return NextResponse.json(
          { error: 'channelUrl is required when adding a source' },
          { status: 400 }
        );
      }

      // Resolve channelId immediately so RSS feeds work
      let channelId = '';
      try {
        channelId = (await resolveChannelId(add.channelUrl)) || '';
      } catch {
        // Non-fatal — channelId can be resolved later during scrape
      }

      try {
        await ContentScoutSource.create({
          userId,
          channelUrl: add.channelUrl,
          channelName: add.channelName || '',
          channelId,
          source: 'manual',
        });
      } catch (err: unknown) {
        const mongoErr = err as { code?: number };
        if (mongoErr.code === 11000) {
          return NextResponse.json(
            { error: 'This channel is already in your list' },
            { status: 409 }
          );
        }
        throw err;
      }
    }

    if (remove) {
      await ContentScoutSource.deleteOne({
        userId,
        channelUrl: remove,
      });
    }

    // Return updated list
    const sources = await ContentScoutSource.find({ userId })
      .sort({ addedAt: -1 })
      .lean();

    return NextResponse.json({ success: true, sources });
  } catch (error) {
    console.error('Error updating content scout sources:', error);
    return NextResponse.json(
      { error: 'Failed to update sources' },
      { status: 500 }
    );
  }
}
