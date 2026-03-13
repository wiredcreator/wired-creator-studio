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
        'Please add it to your .env.local file.'
    );
  }

  cached.client = new Anthropic({ apiKey });
  return cached.client;
}

/** The Claude model to use for all generation tasks. */
export const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

export default getAnthropicClient;
