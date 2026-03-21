const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID || 'Uwpce1RSXlrzF6WBA';

interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  duration: number;
}

interface ApifyVideoResult {
  title: string;
  channel_name: string;
  url: string;
  transcript: TranscriptSegment[];
  status: string;
}

export interface YouTubeTranscriptResult {
  transcript: string;
  title: string;
  channelName: string;
  url: string;
}

/**
 * Extract a YouTube video transcript via Apify.
 * Returns null if the API token is missing, the extraction fails, or no transcript is available.
 */
export async function extractYouTubeTranscript(
  youtubeUrl: string
): Promise<YouTubeTranscriptResult | null> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    console.warn('APIFY_API_TOKEN is not set — skipping YouTube transcript extraction');
    return null;
  }

  // Basic YouTube URL validation
  const lower = youtubeUrl.toLowerCase();
  if (
    !lower.includes('youtube.com') &&
    !lower.includes('youtu.be')
  ) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    const response = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          include_transcript_text: false,
          max_videos: 1,
          youtube_url: youtubeUrl,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      console.error('Apify API error:', response.status, response.statusText);
      return null;
    }

    const results: ApifyVideoResult[] = await response.json();

    if (!results || results.length === 0) {
      return null;
    }

    const video = results[0];

    if (!video.transcript || video.transcript.length === 0) {
      return null;
    }

    // Concatenate all transcript segments into full text
    const fullTranscript = video.transcript
      .map((seg) => seg.text)
      .join(' ')
      .trim();

    if (!fullTranscript) {
      return null;
    }

    return {
      transcript: fullTranscript,
      title: video.title || '',
      channelName: video.channel_name || '',
      url: video.url || youtubeUrl,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Apify request timed out for:', youtubeUrl);
    } else {
      console.error('Error extracting YouTube transcript:', error);
    }
    return null;
  }
}
