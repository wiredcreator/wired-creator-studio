import Anthropic from '@anthropic-ai/sdk';

// ---------------------------------------------------------------------------
// Anthropic Client — singleton
// ---------------------------------------------------------------------------
// The Anthropic SDK reads ANTHROPIC_API_KEY from the environment by default,
// so we rely on process.env.ANTHROPIC_API_KEY being set at runtime.
// We maintain a single instance to avoid repeatedly constructing clients in
// serverless function invocations (hot-reload-safe via globalThis caching).
// ---------------------------------------------------------------------------

interface AnthropicCache {
  client: Anthropic | null;
}

declare global {
  // eslint-disable-next-line no-var
  var anthropicCache: AnthropicCache | undefined;
}

const cached: AnthropicCache = global.anthropicCache ?? { client: null };

if (!global.anthropicCache) {
  global.anthropicCache = cached;
}

/**
 * Returns a singleton Anthropic client.
 *
 * Throws immediately if ANTHROPIC_API_KEY is missing so callers can surface a
 * clear error to the user rather than a cryptic 401 from the API.
 */
export function getAnthropicClient(): Anthropic {
  if (cached.client) {
    return cached.client;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing ANTHROPIC_API_KEY environment variable. ' +
        'Please add it to your .env file.'
    );
  }

  cached.client = new Anthropic({ apiKey, timeout: 180_000 });
  return cached.client;
}

/** The Claude model to use for all generation tasks. */
export const CLAUDE_MODEL = 'claude-sonnet-4-5';

/**
 * Extracts JSON from Claude's response text, handling markdown code fences.
 * Claude sometimes wraps JSON in ```json ... ``` blocks.
 */
export function extractJsonFromResponse(text: string): unknown {
  // First try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Strip markdown code fences and retry
    const stripped = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
    try {
      return JSON.parse(stripped);
    } catch {
      // Last resort: find first JSON object or array
      const match = stripped.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        return JSON.parse(match[1]);
      }
      throw new Error('No valid JSON found in AI response');
    }
  }
}

export default getAnthropicClient;
