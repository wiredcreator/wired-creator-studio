import { NextRequest, NextResponse } from 'next/server';
import { aiLimiter, getRateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import dbConnect from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api-auth';
import ContentScoutSource from '@/models/ContentScoutSource';
import YouTubeChannelCache from '@/models/YouTubeChannelCache';
import ContentScoutResult from '@/models/ContentScoutResult';
import BrandBrain from '@/models/BrandBrain';
import { getAnthropicClient, CLAUDE_MODEL, extractJsonFromResponse } from '@/lib/ai/client';
import { withRetry } from '@/lib/retry';
import { trackAIUsage } from '@/lib/ai/usage-tracker';
import { resolveChannelId, getChannelRSSUrl, getVideoThumbnail } from '@/lib/youtube-utils';
import { assembleBrandBrainContext } from '@/lib/ai/brand-brain-context';
import { timezoneToCountryCode } from '@/lib/timezone-country';
import User from '@/models/User';
import type { ICachedVideo } from '@/models/YouTubeChannelCache';

const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// --- RSS Feed Parser ---

interface RSSVideoEntry {
  videoId: string;
  channelId: string;
  title: string;
  publishedAt: Date;
}

function parseAtomFeed(xml: string): RSSVideoEntry[] {
  const entries: RSSVideoEntry[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];

    const videoIdMatch = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const channelIdMatch = block.match(/<yt:channelId>([^<]+)<\/yt:channelId>/);
    const titleMatch = block.match(/<title>([^<]+)<\/title>/);
    const publishedMatch = block.match(/<published>([^<]+)<\/published>/);

    if (videoIdMatch) {
      entries.push({
        videoId: videoIdMatch[1],
        channelId: channelIdMatch?.[1] || '',
        title: titleMatch?.[1] || '',
        publishedAt: publishedMatch ? new Date(publishedMatch[1]) : new Date(),
      });
    }
  }

  return entries;
}

// --- Fetch channel videos via RSS ---

async function fetchChannelVideos(
  channelId: string,
  channelName: string
): Promise<ICachedVideo[]> {
  const feedUrl = getChannelRSSUrl(channelId);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch(feedUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error('RSS fetch error:', response.status, feedUrl);
      return [];
    }

    const xml = await response.text();
    const entries = parseAtomFeed(xml);

    // Filter to last 7 days
    const cutoff = new Date(Date.now() - SEVEN_DAYS_MS);
    const recent = entries.filter((e) => e.publishedAt >= cutoff);

    return recent.map((entry) => ({
      videoId: entry.videoId,
      title: entry.title,
      url: `https://www.youtube.com/watch?v=${entry.videoId}`,
      thumbnailUrl: getVideoThumbnail(entry.videoId),
      channelName,
      viewCount: 0,
      publishedAt: entry.publishedAt,
      description: '',
    }));
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('RSS fetch timed out for channel:', channelId);
    } else {
      console.error('Error fetching RSS for channel:', channelId, error);
    }
    return [];
  }
}

// --- YouTube Shorts filter ---

async function isYouTubeShort(videoId: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // If YouTube returns 200, it's a Short. If it redirects (301/302), it's a regular video.
    return res.status === 200;
  } catch {
    // On error, assume it's not a Short (keep the video)
    return false;
  }
}

async function isVideoUnavailable(videoId: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    // 200 = available, anything else = unavailable/restricted
    return res.status !== 200;
  } catch {
    // On error, assume available (better to show than over-filter)
    return false;
  }
}

async function filterOutShorts(videos: ICachedVideo[]): Promise<ICachedVideo[]> {
  if (videos.length === 0) return videos;

  const results = await Promise.all(
    videos.map(async (video) => {
      const [isShort, unavailable] = await Promise.all([
        isYouTubeShort(video.videoId),
        isVideoUnavailable(video.videoId),
      ]);
      return (isShort || unavailable) ? null : video;
    })
  );

  return results.filter((v): v is ICachedVideo => v !== null);
}

// --- YouTube Data API country restriction filter ---

interface YouTubeContentDetails {
  regionRestriction?: {
    allowed?: string[];
    blocked?: string[];
  };
}

interface YouTubeVideoItem {
  id: string;
  contentDetails: YouTubeContentDetails;
}

interface YouTubeVideosResponse {
  items: YouTubeVideoItem[];
}

/**
 * Filters out videos that are region-restricted for the given country code.
 * Only runs if YOUTUBE_DATA_API_KEY env var is set.
 * On any error, returns the original list (never breaks the pipeline).
 */
async function filterCountryRestricted(
  videos: ICachedVideo[],
  countryCode: string
): Promise<ICachedVideo[]> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY;
  if (!apiKey || videos.length === 0 || !countryCode) return videos;

  try {
    // Batch video IDs (max 50 per API call)
    const videoIds = videos.map((v) => v.videoId).join(',');
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error('YouTube Data API error:', res.status, await res.text().catch(() => ''));
      return videos;
    }

    const data = (await res.json()) as YouTubeVideosResponse;

    // Build a set of blocked video IDs
    const blockedIds = new Set<string>();

    for (const item of data.items || []) {
      const restriction = item.contentDetails?.regionRestriction;
      if (!restriction) continue; // No restriction, keep video

      if (restriction.blocked && restriction.blocked.includes(countryCode)) {
        blockedIds.add(item.id);
      } else if (restriction.allowed && !restriction.allowed.includes(countryCode)) {
        blockedIds.add(item.id);
      }
    }

    if (blockedIds.size > 0) {
      console.log(`Country filter (${countryCode}): removed ${blockedIds.size} region-restricted video(s)`);
    }

    return videos.filter((v) => !blockedIds.has(v.videoId));
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('YouTube Data API request timed out');
    } else {
      console.error('YouTube Data API country filter failed (continuing without filter):', err);
    }
    return videos;
  }
}

// --- Relevance filter via Claude ---

async function filterRelevantVideos(
  videos: ICachedVideo[],
  niche: string,
  keywords: string[],
  userId?: string
): Promise<ICachedVideo[]> {
  if (videos.length === 0 || !niche) return videos;

  try {
    const client = getAnthropicClient();
    const videoList = videos.map((v, i) => `${i}. "${v.title}" (${v.channelName})`).join('\n');

    const startMs = Date.now();
    const response = await withRetry(() =>
      client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are filtering YouTube videos for relevance to a creator's niche.

Niche: "${niche}"
${keywords.length > 0 ? `Keywords: ${keywords.join(', ')}` : ''}

Videos:
${videoList}

Return a JSON array of the INDEX NUMBERS (integers) of videos that are relevant to this niche. Remove videos that are clearly off-topic (e.g., factory tours, unrelated product reviews, cooking videos for a tech niche, etc.). When in doubt, keep the video.

Return ONLY the JSON array of integers, nothing else.`,
          },
        ],
      })
    );
    if (userId) trackAIUsage({ userId, feature: 'content_scout_scrape', response, durationMs: Date.now() - startMs });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return videos;

    const relevantIndices = extractJsonFromResponse(textBlock.text) as number[];
    if (!Array.isArray(relevantIndices)) return videos;

    return relevantIndices
      .filter((i) => typeof i === 'number' && i >= 0 && i < videos.length)
      .map((i) => videos[i]);
  } catch (err) {
    console.error('Relevance filter failed, returning all videos:', err);
    return videos;
  }
}

// POST /api/content-scout/scrape — Scrape videos from all followed channels
export async function POST(request: NextRequest) {
  try {
    const rl = aiLimiter.check(getRateLimitKey(request, 'content-scout-scrape'));
    if (!rl.success) return rateLimitResponse(rl.resetIn);

    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const userId = user.id;

    // Get all sources for this user
    const sources = await ContentScoutSource.find({ userId }).lean();

    if (sources.length === 0) {
      return NextResponse.json(
        { error: 'No channels to scrape. Add channels or run discovery first.' },
        { status: 422 }
      );
    }

    const allVideos: ICachedVideo[] = [];

    for (const source of sources) {
      // Resolve channelId if missing
      let channelId = source.channelId;
      if (!channelId && source.channelUrl) {
        channelId = (await resolveChannelId(source.channelUrl)) || undefined;
        if (channelId) {
          // Persist the resolved channelId for future runs
          await ContentScoutSource.updateOne(
            { _id: source._id },
            { $set: { channelId } }
          );
        }
      }

      if (!channelId) {
        console.warn('Could not resolve channelId for:', source.channelUrl);
        continue;
      }

      // Check cache first (keyed by channelUrl for backwards compatibility)
      const cached = await YouTubeChannelCache.findOne({
        channelUrl: source.channelUrl,
      }).lean();

      if (cached && cached.expiresAt > new Date()) {
        // Cache hit — filter out any Shorts that slipped into cache before this filter existed
        const cachedFiltered = await filterOutShorts(cached.videos as ICachedVideo[]);
        allVideos.push(...cachedFiltered);
        continue;
      }

      // Cache miss or expired — fetch via RSS
      const rawVideos = await fetchChannelVideos(
        channelId,
        source.channelName || ''
      );

      // Filter out YouTube Shorts before caching
      const videos = await filterOutShorts(rawVideos);

      if (videos.length > 0) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + CACHE_DURATION_MS);

        // Upsert the cache entry
        await YouTubeChannelCache.findOneAndUpdate(
          { channelUrl: source.channelUrl },
          {
            channelUrl: source.channelUrl,
            channelName: videos[0]?.channelName || source.channelName || '',
            videos,
            scrapedAt: now,
            expiresAt,
          },
          { upsert: true, new: true }
        );

        allVideos.push(...videos);
      }
    }

    // Country restriction filter — remove videos unavailable in the user's country
    let countryFilteredVideos = allVideos;
    if (process.env.YOUTUBE_DATA_API_KEY) {
      const userDoc = await User.findById(userId).select('timezone').lean();
      const countryCode = timezoneToCountryCode(userDoc?.timezone || '');
      if (countryCode) {
        countryFilteredVideos = await filterCountryRestricted(allVideos, countryCode);
      }
    }

    // Relevance filter — remove off-topic videos using Brand Brain niche
    const brandBrain = await BrandBrain.findOne({ userId }).lean();
    const niche = brandBrain?.industryData?.field || '';
    const nicheKeywords = brandBrain?.industryData?.keywords || [];

    const relevantVideos = await filterRelevantVideos(countryFilteredVideos, niche, nicheKeywords, userId);

    // Sort by publishedAt desc, take top 15
    const sortedVideos = relevantVideos
      .sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 15);

    // Store as ContentScoutResult for this user (upsert — one result per user)
    const result = await ContentScoutResult.findOneAndUpdate(
      { userId },
      {
        userId,
        videos: sortedVideos,
        generatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Generate unique ideas from scraped videos (non-blocking best-effort)
    if (sortedVideos.length > 0) {
      try {
        const brandBrainContext = await assembleBrandBrainContext(userId, {
          includeToneOfVoice: true,
          includeContentPillars: true,
          includeIndustryData: true,
          includeEquipmentProfile: false,
          includeTranscripts: false,
        });

        const videoSummary = sortedVideos.slice(0, 8).map((v) =>
          `- "${v.title}" by ${v.channelName} (${v.url})`
        ).join('\n');

        const client = getAnthropicClient();
        const startMs = Date.now();
        const response = await withRetry(() =>
          client.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 2048,
            system: `You are a content strategist. Generate unique content ideas inspired by trending videos, tailored to the student's niche and Brand Brain context. Each idea should combine trending topics with the student's unique perspective.`,
            messages: [{
              role: 'user',
              content: `## Trending Videos\n${videoSummary}\n\n${brandBrainContext || '(No Brand Brain context available.)'}\n\nGenerate 4-6 unique content ideas inspired by these trending videos. Each idea should put a unique spin relevant to the student's niche.\n\nReturn a JSON array of objects with:\n- title: string (compelling video title)\n- description: string (2-3 sentences on the angle)\n- sourceVideoTitle: string (which trending video inspired this)\n- sourceVideoUrl: string (URL of that video)\n- category: string (e.g. "reaction", "tutorial", "commentary", "behind-the-scenes")\n\nReturn ONLY the JSON array.`,
            }],
          })
        );

        trackAIUsage({ userId, feature: 'content_scout_ideas', response, durationMs: Date.now() - startMs });

        const textBlock = response.content.find((b) => b.type === 'text');
        if (textBlock && textBlock.type === 'text') {
          const ideas = extractJsonFromResponse(textBlock.text);
          if (Array.isArray(ideas) && ideas.length > 0) {
            await ContentScoutResult.updateOne(
              { userId },
              { $set: { generatedIdeas: ideas } }
            );
          }
        }
      } catch (err) {
        console.error('Failed to generate unique ideas (non-blocking):', err);
      }
    }

    return NextResponse.json({
      success: true,
      videos: result.videos,
      count: result.videos.length,
      scrapedChannels: sources.length,
    });
  } catch (error) {
    console.error('Error scraping channels:', error);
    return NextResponse.json(
      { error: 'Failed to scrape channels' },
      { status: 500 }
    );
  }
}
