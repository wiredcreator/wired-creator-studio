// ---------------------------------------------------------------------------
// Google Doc Plain-Text Fetcher (no auth required for public docs)
// ---------------------------------------------------------------------------

interface CacheEntry {
  text: string;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetches the plain-text export of a public Google Doc.
 * Results are cached in memory for `ttlMs` (default 1 hour) so repeated
 * calls within the same server process don't hit Google every time.
 *
 * Returns the doc text, or an empty string if the fetch fails (so callers
 * can degrade gracefully without breaking idea generation).
 */
export async function fetchGoogleDocText(
  docId: string,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<string> {
  const cached = cache.get(docId);
  if (cached && Date.now() - cached.fetchedAt < ttlMs) {
    return cached.text;
  }

  try {
    const url = `https://docs.google.com/document/d/${docId}/export?format=txt`;
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      console.error(`[google-doc-fetcher] Failed to fetch doc ${docId}: ${res.status}`);
      return cached?.text ?? '';
    }
    const text = (await res.text()).trim();
    cache.set(docId, { text, fetchedAt: Date.now() });
    return text;
  } catch (err) {
    console.error(`[google-doc-fetcher] Error fetching doc ${docId}:`, err);
    return cached?.text ?? '';
  }
}
