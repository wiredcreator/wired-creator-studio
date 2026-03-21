import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { extractYouTubeTranscript } from '@/lib/apify';
import { transcriptLimiter, getRateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import dbConnect from '@/lib/db';
import YouTubeTranscriptCache from '@/models/YouTubeTranscriptCache';

export async function POST(request: NextRequest) {
  try {
    const rl = transcriptLimiter.check(getRateLimitKey(request, 'youtube-transcript'));
    if (!rl.success) return rateLimitResponse(rl.resetIn);

    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;

    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'A YouTube URL is required' },
        { status: 400 }
      );
    }

    const lower = url.toLowerCase();
    if (!lower.includes('youtube.com') && !lower.includes('youtu.be')) {
      return NextResponse.json(
        { error: 'Please provide a valid YouTube URL' },
        { status: 400 }
      );
    }

    // Check cache first
    await dbConnect();
    const cached = await YouTubeTranscriptCache.findOne({
      url: url.trim(),
      expiresAt: { $gt: new Date() },
    }).lean();

    if (cached) {
      return NextResponse.json({
        transcript: cached.transcript,
        title: cached.title,
        channelName: cached.channelName,
        url: cached.url,
        cached: true,
      });
    }

    const result = await extractYouTubeTranscript(url);

    if (!result) {
      return NextResponse.json(
        { error: 'Could not extract transcript from this video. It may not have captions available.' },
        { status: 422 }
      );
    }

    // Save to cache (7 days)
    try {
      await YouTubeTranscriptCache.findOneAndUpdate(
        { url: url.trim() },
        {
          url: url.trim(),
          transcript: result.transcript,
          title: result.title,
          channelName: result.channelName,
          fetchedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        { upsert: true }
      );
    } catch {
      // Cache save is best-effort
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('YouTube transcript extraction error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
