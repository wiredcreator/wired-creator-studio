import { NextRequest, NextResponse } from 'next/server';
import { aiLimiter, getRateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import dbConnect from '@/lib/db';
import { getAnthropicClient, CLAUDE_MODEL, extractJsonFromResponse } from '@/lib/ai/client';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const maxDuration = 60; // seconds - web search + AI parsing can take a while
import { trackAIUsage } from '@/lib/ai/usage-tracker';
import ContentIdea from '@/models/ContentIdea';
import { validateObjectId } from '@/lib/validation';

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  stats: 'Statistics, data points, percentages, and research findings',
  studies: 'Academic studies, clinical research, and scientific papers',
  news: 'Recent news articles, trends, and cultural moments',
  quotes: 'Published quotes from known experts and thought leaders',
  examples: 'Real-world case studies, success stories, and examples',
};

// POST /api/ideas/[id]/find-sources — Find online sources for a video idea using web search
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = aiLimiter.check(getRateLimitKey(request, 'ideas-find-sources'));
    if (!rl.success) return rateLimitResponse(rl.resetIn);

    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { id } = await params;
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

    const idea = await ContentIdea.findById(id);
    if (!idea) {
      return NextResponse.json({ error: 'Content idea not found' }, { status: 404 });
    }

    if (idea.userId.toString() !== user.id && user.role === 'student') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();
    const { query, categories } = body as { query: string; categories: string[] };

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const validCategories = (categories || []).filter(
      (c: string) => c in CATEGORY_DESCRIPTIONS
    );

    // Build concept context
    const conceptParts: string[] = [];
    if (idea.conceptAnswers?.whoIsThisFor) {
      conceptParts.push(`Target audience: ${idea.conceptAnswers.whoIsThisFor}`);
    }
    if (idea.conceptAnswers?.whatWillTheyLearn) {
      conceptParts.push(`Key takeaway: ${idea.conceptAnswers.whatWillTheyLearn}`);
    }
    if (idea.conceptAnswers?.whyShouldTheyCare) {
      conceptParts.push(`Why it matters: ${idea.conceptAnswers.whyShouldTheyCare}`);
    }

    const categoryLines = validCategories.length > 0
      ? validCategories.map((c: string) => `- ${CATEGORY_DESCRIPTIONS[c]}`).join('\n')
      : Object.values(CATEGORY_DESCRIPTIONS).map((d) => `- ${d}`).join('\n');

    const systemPrompt = `You are a research assistant helping a content creator find credible online sources for their video.

The creator is working on a video titled: "${idea.title}"
${idea.description ? `Description: ${idea.description}` : ''}
${conceptParts.length > 0 ? `\nConcept context:\n${conceptParts.join('\n')}` : ''}

Search the web and find relevant sources. Focus on these types of content:
${categoryLines}

For each source you find, provide:
1. A clear, descriptive title
2. The URL
3. A 2-3 sentence summary of the key finding or quote that's relevant to this video

Format your response as a JSON array:
[
  { "title": "Source title", "url": "https://...", "summary": "Key finding or quote..." },
  ...
]

Find 5-8 high-quality, recent sources. Prefer authoritative sources (research institutions, major publications, industry experts). Return ONLY valid JSON.`;

    const client = getAnthropicClient();
    const startMs = Date.now();

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: query }],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    });

    trackAIUsage({ userId: user.id, feature: 'find_sources', response, durationMs: Date.now() - startMs });

    // Extract text from response content blocks
    const textParts: string[] = [];
    for (const block of response.content) {
      if (block.type === 'text') {
        textParts.push(block.text);
      }
    }
    // Strip any XML/HTML tags Claude may include (e.g. <cite>, <source>, <ref>)
    // but preserve the text content inside them
    const fullText = textParts.join('').replace(/<\/?[a-zA-Z][^>]*>/g, '');

    if (!fullText) {
      return NextResponse.json({ error: 'No text response from AI' }, { status: 500 });
    }

    let parsed: Array<{ title: string; url: string; summary: string }>;
    try {
      parsed = extractJsonFromResponse(fullText) as Array<{ title: string; url: string; summary: string }>;
    } catch {
      return NextResponse.json({ error: 'Failed to parse sources from AI response' }, { status: 500 });
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Invalid response format from AI' }, { status: 500 });
    }

    const resources = parsed.map((source) => ({
      type: 'text' as const,
      source: 'online' as const,
      name: source.title,
      content: `${source.summary}\n\nSource: ${source.url}`,
      createdAt: new Date(),
    }));

    return NextResponse.json({ resources });
  } catch (error: unknown) {
    const status = (error as { status?: number })?.status;
    if (status === 429) {
      return NextResponse.json(
        { error: 'AI is temporarily busy. Please wait a minute and try again.' },
        { status: 429 }
      );
    }
    console.error('Error in find-sources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
