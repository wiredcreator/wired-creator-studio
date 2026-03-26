/**
 * Resolve a YouTube channel URL (e.g., https://www.youtube.com/@NateHerk)
 * to a channelId (e.g., UCxxxxx) by fetching the page and extracting from meta tags.
 */
export async function resolveChannelId(channelUrl: string): Promise<string | null> {
  // If the URL is already a /channel/UCxxxxx format, extract directly
  const directMatch = channelUrl.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/);
  if (directMatch) {
    return directMatch[1];
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(channelUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const html = await response.text();

    // 1. <meta itemprop="channelId" content="UCxxxxx">
    const metaMatch = html.match(/<meta\s+itemprop="channelId"\s+content="(UC[a-zA-Z0-9_-]+)"/);
    if (metaMatch) return metaMatch[1];

    // 2. <link rel="canonical" href="https://www.youtube.com/channel/UCxxxxx">
    const canonicalMatch = html.match(
      /<link\s+rel="canonical"\s+href="https?:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)"/
    );
    if (canonicalMatch) return canonicalMatch[1];

    // 3. "channelId":"UCxxxxx" in JSON-LD or ytInitialData
    const jsonMatch = html.match(/"channelId":"(UC[a-zA-Z0-9_-]+)"/);
    if (jsonMatch) return jsonMatch[1];

    // 4. channel_id=UCxxxxx in any URL on the page
    const paramMatch = html.match(/channel_id=(UC[a-zA-Z0-9_-]+)/);
    if (paramMatch) return paramMatch[1];

    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve a YouTube channel URL to both channelId and avatar URL in one fetch.
 */
export async function resolveChannelInfo(channelUrl: string): Promise<{
  channelId: string | null;
  avatarUrl: string | null;
  channelName: string | null;
}> {
  const result = { channelId: null as string | null, avatarUrl: null as string | null, channelName: null as string | null };

  // If the URL is already a /channel/UCxxxxx format, extract directly but still fetch for avatar
  const directMatch = channelUrl.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/);
  if (directMatch) {
    result.channelId = directMatch[1];
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(channelUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) return result;

    const html = await response.text();

    // Extract channelId
    if (!result.channelId) {
      const metaMatch = html.match(/<meta\s+itemprop="channelId"\s+content="(UC[a-zA-Z0-9_-]+)"/);
      if (metaMatch) result.channelId = metaMatch[1];

      if (!result.channelId) {
        const canonicalMatch = html.match(
          /<link\s+rel="canonical"\s+href="https?:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)"/
        );
        if (canonicalMatch) result.channelId = canonicalMatch[1];
      }

      if (!result.channelId) {
        const jsonMatch = html.match(/"channelId":"(UC[a-zA-Z0-9_-]+)"/);
        if (jsonMatch) result.channelId = jsonMatch[1];
      }

      if (!result.channelId) {
        const paramMatch = html.match(/channel_id=(UC[a-zA-Z0-9_-]+)/);
        if (paramMatch) result.channelId = paramMatch[1];
      }
    }

    // Extract avatar URL from og:image or channel avatar patterns
    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
    if (ogImageMatch) {
      result.avatarUrl = ogImageMatch[1];
    } else {
      // Try ytInitialData avatar pattern
      const avatarMatch = html.match(/"avatar":\s*\{[^}]*"thumbnails":\s*\[\s*\{[^}]*"url":\s*"([^"]+)"/);
      if (avatarMatch) {
        result.avatarUrl = avatarMatch[1];
      }
    }

    // Extract channel name
    const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
    if (ogTitleMatch) {
      result.channelName = ogTitleMatch[1];
    } else {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        result.channelName = titleMatch[1].replace(/ - YouTube$/, '');
      }
    }

    return result;
  } catch {
    return result;
  }
}

/**
 * Construct a YouTube RSS feed URL from a channelId.
 */
export function getChannelRSSUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

/**
 * Construct a YouTube video thumbnail URL from a videoId.
 */
export function getVideoThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
