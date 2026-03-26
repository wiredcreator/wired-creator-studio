import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getAnthropicClient, CLAUDE_MODEL, extractJsonFromResponse } from '@/lib/ai/client';
import { withRetry } from '@/lib/retry';
import ContentScoutSource from '@/models/ContentScoutSource';
import ContentDNAResponse from '@/models/ContentDNAResponse';
import BrandBrain from '@/models/BrandBrain';
import { resolveChannelId, resolveChannelInfo } from '@/lib/youtube-utils';

interface DiscoveredChannel {
  channelName: string;
  channelUrl: string;
  channelId: string;
  source: 'ai' | 'search' | 'content-dna';
  thumbnailUrl?: string;
}

const APIFY_CHANNEL_SEARCH_ACTOR_ID = 'nfyn3ecod9uCDaoVH';

// --- Apify YouTube Channel Search ---

interface YouTubeChannelSearchResult {
  channelName: string;
  channelUrl: string;
  channelId?: string;
  thumbnailUrl?: string;
}

async function searchYouTubeChannels(
  query: string
): Promise<YouTubeChannelSearchResult[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    console.log('[ContentScout] No APIFY_API_TOKEN — skipping YouTube search');
    return [];
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    const apiUrl = `https://api.apify.com/v2/acts/${APIFY_CHANNEL_SEARCH_ACTOR_ID}/run-sync-get-dataset-items?token=${token.slice(0, 8)}...`;
    const body = {
      query,
      maxResults: 20,
      type: 'channel',
      local: false,
      scrapeAllResults: false,
    };
    console.log(`[ContentScout] POST ${apiUrl}`);
    console.log(`[ContentScout] Body:`, JSON.stringify(body));

    const res = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_CHANNEL_SEARCH_ACTOR_ID}/run-sync-get-dataset-items?token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      console.log(`[ContentScout] Apify channel search failed with status ${res.status}`);
      console.log(`[ContentScout] Error response:`, errorBody.slice(0, 500));
      return [];
    }

    const results: Record<string, unknown>[] = await res.json().catch(() => []);
    console.log(`[ContentScout] Got ${results.length} channel results`);
    if (results.length > 0) {
      console.log(`[ContentScout] First result keys:`, Object.keys(results[0]));
      console.log(`[ContentScout] First result sample:`, JSON.stringify(results[0]).slice(0, 500));
    }

    // Map results to our format using actual Apify response field names
    const channels: YouTubeChannelSearchResult[] = [];
    for (const r of results) {
      const channelName = (r.channelTitle || r.title || '') as string;
      const handle = (r.channelHandle || '') as string;
      const channelUrl = handle
        ? `https://www.youtube.com/${handle}`
        : '';

      // Extract thumbnail URL — thumbnail is an array of {url, width, height}
      let thumbnailUrl = '';
      const thumb = r['thumbnail'];
      if (Array.isArray(thumb) && thumb.length > 0) {
        // Pick the largest thumbnail
        const best = thumb[thumb.length - 1];
        thumbnailUrl = (best?.url || '') as string;
      } else if (typeof thumb === 'string') {
        thumbnailUrl = thumb;
      }

      if (thumbnailUrl && thumbnailUrl.startsWith('//')) {
        thumbnailUrl = 'https:' + thumbnailUrl;
      }

      const channelId = (r.channelId || '') as string;

      if (channelUrl && channelName) {
        channels.push({ channelName, channelUrl, channelId: channelId || undefined, thumbnailUrl: thumbnailUrl || undefined });
      }
    }

    console.log(`[ContentScout] Channels found:`, channels.map(c => `${c.channelName} (${c.channelUrl})`));
    return channels;
  } catch (err) {
    console.error('[ContentScout] Apify YouTube channel search failed:', err);
    return [];
  }
}

// POST /api/content-scout/discover — Discover YouTube channel candidates
// Returns candidates for user to select (does NOT auto-save)
export async function POST() {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const userId = user.id;

    // Fetch Brand Brain for industry/niche data
    const brandBrain = await BrandBrain.findOne({ userId }).lean();
    const niche = brandBrain?.industryData?.field || '';
    const nicheKeywords = brandBrain?.industryData?.keywords || [];

    // Fetch Content DNA for creator examples
    const contentDNA = await ContentDNAResponse.findOne({ userId }).lean();
    const creatorUrls: string[] = [];

    if (contentDNA?.creatorExamples) {
      for (const example of contentDNA.creatorExamples) {
        if (
          example.url &&
          (example.url.includes('youtube.com') || example.url.includes('youtu.be'))
        ) {
          // Skip video URLs — we need channel URLs
          if (!example.url.includes('/watch') && !example.url.includes('youtu.be/')) {
            creatorUrls.push(example.url);
          }
        }
      }
    }

    // Fetch existing sources to avoid suggesting duplicates
    const existingSources = await ContentScoutSource.find({ userId }).lean();
    const existingUrls = new Set(existingSources.map((s) => s.channelUrl));
    const existingChannelIds = new Set(
      existingSources.filter((s) => s.channelId).map((s) => s.channelId)
    );

    const candidates: DiscoveredChannel[] = [];
    const seenChannelIds = new Set<string>();

    // Helper to add a candidate (deduplicates by channelId)
    const addCandidate = (ch: DiscoveredChannel) => {
      if (seenChannelIds.has(ch.channelId)) return;
      if (existingChannelIds.has(ch.channelId)) return;
      if (existingUrls.has(ch.channelUrl)) return;
      seenChannelIds.add(ch.channelId);
      candidates.push(ch);
    };

    // --- Source 1: Content DNA creator examples ---
    for (const url of creatorUrls) {
      try {
        const info = await resolveChannelInfo(url);
        if (info.channelId) {
          addCandidate({
            channelName: info.channelName || '',
            channelUrl: url,
            channelId: info.channelId,
            source: 'content-dna',
            thumbnailUrl: info.avatarUrl || undefined,
          });
        }
      } catch {
        // skip unresolvable
      }
    }

    // --- Source 2: Apify YouTube Search (real channels from trending videos) ---
    // Single Apify search using the niche (one run per onboarding to save costs)
    const searchQuery = niche || (nicheKeywords.length > 0 ? nicheKeywords.join(' ') : '');
    const searchResults: YouTubeChannelSearchResult[][] = [];
    if (searchQuery) {
      const results = await searchYouTubeChannels(searchQuery);
      searchResults.push(results);
    }

    for (const channels of searchResults) {
      for (const ch of channels) {
        if (existingUrls.has(ch.channelUrl)) continue;

        if (ch.channelId) {
          addCandidate({
            channelName: ch.channelName,
            channelUrl: ch.channelUrl,
            channelId: ch.channelId,
            source: 'search',
            thumbnailUrl: ch.thumbnailUrl,
          });
        } else {
          try {
            const info = await resolveChannelInfo(ch.channelUrl);
            if (info.channelId) {
              addCandidate({
                channelName: ch.channelName || info.channelName || '',
                channelUrl: ch.channelUrl,
                channelId: info.channelId,
                source: 'search',
                thumbnailUrl: ch.thumbnailUrl || info.avatarUrl || undefined,
              });
            }
          } catch {
            // skip
          }
        }
      }
    }

    // --- Source 3: Claude AI recommendations ---
    const nicheDescription = niche
      ? `${niche}${nicheKeywords.length > 0 ? ` (keywords: ${nicheKeywords.join(', ')})` : ''}`
      : 'general content creation';

    const allKnownChannels = [
      ...existingSources.map((s) => `- ${s.channelName || s.channelUrl}`),
      ...candidates.map((c) => `- ${c.channelName || c.channelUrl}`),
    ];

    const existingChannelsContext =
      allKnownChannels.length > 0
        ? `Already known channels (do NOT suggest these):\n${allKnownChannels.join('\n')}`
        : '';

    const creatorUrlsContext =
      creatorUrls.length > 0
        ? `\nCreator examples from onboarding: ${creatorUrls.join(', ')}`
        : '';

    try {
      const client = getAnthropicClient();

      const response = await withRetry(() =>
        client.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: `Find 5-8 top-performing INDIVIDUAL YouTube creators (not companies or brands) in the "${nicheDescription}" space. ${existingChannelsContext}${creatorUrlsContext}

IMPORTANT RULES:
- Only recommend INDIVIDUAL creators and solo YouTubers, NOT company channels (e.g., don't suggest Zapier, HubSpot, Salesforce, etc.)
- Focus on creators who teach, share insights, or create educational/entertaining content in this niche
- Only suggest channels you are VERY confident actually exist on YouTube
- Use the @handle format for URLs (e.g., https://www.youtube.com/@NickSaraev)
- Do NOT include any channels already listed above

Return a JSON array of objects with these fields:
- channelName: string (the channel's display name)
- channelUrl: string (the full YouTube channel URL using @handle format)

Return ONLY the JSON array, no other text.`,
            },
          ],
        })
      );

      const textBlock = response.content.find((b) => b.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        const aiChannels = extractJsonFromResponse(textBlock.text) as {
          channelName: string;
          channelUrl: string;
        }[];

        if (Array.isArray(aiChannels)) {
          for (const ch of aiChannels) {
            if (!ch.channelUrl || existingUrls.has(ch.channelUrl)) continue;

            try {
              const info = await resolveChannelInfo(ch.channelUrl);
              if (info.channelId) {
                addCandidate({
                  channelName: ch.channelName || info.channelName || '',
                  channelUrl: ch.channelUrl,
                  channelId: info.channelId,
                  source: 'ai',
                  thumbnailUrl: info.avatarUrl || undefined,
                });
              }
            } catch {
              // Skip hallucinated channels
            }
          }
        }
      }
    } catch (err) {
      console.error('Claude channel discovery failed:', err);
      // Continue with Apify results even if Claude fails
    }

    // Backfill channelIds for existing sources that don't have one
    const sourcesWithoutChannelId = existingSources.filter((s) => !s.channelId);
    for (const source of sourcesWithoutChannelId) {
      try {
        const channelId = await resolveChannelId(source.channelUrl);
        if (channelId) {
          await ContentScoutSource.updateOne(
            { _id: source._id },
            { channelId }
          );
        }
      } catch {
        // skip
      }
    }

    return NextResponse.json({
      success: true,
      candidates,
      existingSources: existingSources.length,
    });
  } catch (error) {
    console.error('Error discovering channels:', error);
    return NextResponse.json(
      { error: 'Failed to discover channels' },
      { status: 500 }
    );
  }
}

// PUT /api/content-scout/discover — Confirm selected channels
export async function PUT(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const userId = user.id;
    const body = await request.json();
    const { channels } = body as {
      channels: DiscoveredChannel[];
    };

    if (!Array.isArray(channels) || channels.length === 0) {
      return NextResponse.json(
        { error: 'No channels selected' },
        { status: 400 }
      );
    }

    let added = 0;
    for (const ch of channels) {
      try {
        await ContentScoutSource.create({
          userId,
          channelUrl: ch.channelUrl,
          channelName: ch.channelName || '',
          channelId: ch.channelId || '',
          source: ch.source === 'content-dna' ? 'manual' : 'discovered',
        });
        added++;
      } catch (err: unknown) {
        const mongoErr = err as { code?: number };
        if (mongoErr.code !== 11000) {
          console.error('Error saving selected channel:', err);
        }
      }
    }

    const allSources = await ContentScoutSource.find({ userId })
      .sort({ addedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      added,
      sources: allSources,
    });
  } catch (error) {
    console.error('Error confirming channels:', error);
    return NextResponse.json(
      { error: 'Failed to save selected channels' },
      { status: 500 }
    );
  }
}
