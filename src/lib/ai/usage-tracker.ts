import dbConnect from '@/lib/db';
import AIUsageLog from '@/models/AIUsageLog';

// ---------------------------------------------------------------------------
// Pricing — Claude Sonnet 4.6 (per million tokens)
// Update these when switching models or when pricing changes.
// ---------------------------------------------------------------------------
const PRICING: Record<string, { inputPerM: number; outputPerM: number }> = {
  'claude-sonnet-4-6-20250415': { inputPerM: 3, outputPerM: 15 },
};

const DEFAULT_PRICING = { inputPerM: 3, outputPerM: 15 };

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model] || DEFAULT_PRICING;
  return (inputTokens / 1_000_000) * pricing.inputPerM +
    (outputTokens / 1_000_000) * pricing.outputPerM;
}

// ---------------------------------------------------------------------------
// trackAIUsage — fire-and-forget logger
// ---------------------------------------------------------------------------

export type AIFeature =
  | 'tone_of_voice'
  | 'brain_dump'
  | 'idea_generation'
  | 'script_generation'
  | 'voice_storming'
  | 'session_title'
  | 'side_quests'
  | 'content_scout_discover'
  | 'content_scout_scrape'
  | 'content_scout_ideas'
  | 'voice_storming_prompts'
  | 'idea_concept'
  | 'idea_alternative_titles'
  | 'idea_outline'
  | 'content_pillar_generation'
  | 'personal_baseline_processing'
  | 'student_profile_compile'
  | 'find_sources';

interface AnthropicResponse {
  model: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

interface TrackOptions {
  userId: string;
  feature: AIFeature;
  response: AnthropicResponse;
  durationMs?: number;
}

interface TrackErrorOptions {
  userId: string;
  feature: AIFeature;
  aiModel: string;
  error: unknown;
  durationMs?: number;
}

/**
 * Logs a successful Claude API call. Fire-and-forget — failures are swallowed
 * so AI usage tracking never blocks the main request.
 */
export function trackAIUsage({ userId, feature, response, durationMs }: TrackOptions): void {
  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  const totalTokens = inputTokens + outputTokens;
  const estimatedCostUsd = estimateCost(response.model, inputTokens, outputTokens);

  // Fire and forget
  (async () => {
    try {
      await dbConnect();
      await AIUsageLog.create({
        userId,
        feature,
        aiModel: response.model,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostUsd,
        success: true,
        durationMs,
      });
    } catch (err) {
      console.error('[AIUsageTracker] Failed to log usage:', err);
    }
  })();
}

/**
 * Logs a failed Claude API call. Fire-and-forget.
 */
export function trackAIError({ userId, feature, aiModel, error, durationMs }: TrackErrorOptions): void {
  const message = error instanceof Error ? error.message : String(error);

  (async () => {
    try {
      await dbConnect();
      await AIUsageLog.create({
        userId,
        feature,
        aiModel,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        success: false,
        errorMessage: message.slice(0, 500),
        durationMs,
      });
    } catch (err) {
      console.error('[AIUsageTracker] Failed to log error:', err);
    }
  })();
}
