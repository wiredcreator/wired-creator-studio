import { NextRequest, NextResponse } from 'next/server';
import { aiLimiter, getRateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import dbConnect from '@/lib/db';
import ContentIdea from '@/models/ContentIdea';
import { getAnthropicClient, CLAUDE_MODEL, extractJsonFromResponse } from '@/lib/ai/client';
import { trackAIUsage } from '@/lib/ai/usage-tracker';
import { assembleBrandBrainContext } from '@/lib/ai/brand-brain-context';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validateObjectId } from '@/lib/validation';

// POST /api/ideas/[id]/ai — AI generation for parking lot steps
// body.action: 'concept' | 'alternativeTitles' | 'outline'
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = aiLimiter.check(getRateLimitKey(request, 'ideas-ai'));
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
    const { action } = body;

    const client = getAnthropicClient();
    const brandBrainContext = await assembleBrandBrainContext(user.id, {
      includeToneOfVoice: true,
      includeContentPillars: true,
      includeIndustryData: true,
    });

    switch (action) {
      case 'concept': {
        const startMs = Date.now();
        const response = await client.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 1024,
          system: `You are a content strategist helping a creator develop video concepts. Use the creator's brand context to tailor your answers.\n\n${brandBrainContext}`,
          messages: [
            {
              role: 'user',
              content: `For the video idea titled "${idea.title}"${idea.description ? ` (description: ${idea.description})` : ''}, answer these three concept questions in JSON format:

1. "whoIsThisFor" — Who is the target audience for this video? Be specific about the viewer persona.
2. "whatWillTheyLearn" — What specific value, insight, or skill will the viewer gain?
3. "whyShouldTheyCare" — Why is this relevant/urgent/interesting right now?

Respond with ONLY valid JSON:
{
  "whoIsThisFor": "...",
  "whatWillTheyLearn": "...",
  "whyShouldTheyCare": "..."
}`,
            },
          ],
        });

        trackAIUsage({ userId: user.id, feature: 'idea_concept', response, durationMs: Date.now() - startMs });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const parsed = extractJsonFromResponse(text) as Record<string, string>;

        return NextResponse.json({
          conceptAnswers: {
            whoIsThisFor: parsed.whoIsThisFor || '',
            whatWillTheyLearn: parsed.whatWillTheyLearn || '',
            whyShouldTheyCare: parsed.whyShouldTheyCare || '',
          },
        });
      }

      case 'alternativeTitles': {
        const startMs = Date.now();
        const response = await client.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 1024,
          system: `You are a YouTube title expert. Generate compelling, click-worthy alternative titles that maintain the core topic but offer different angles, hooks, or framings.\n\n${brandBrainContext}`,
          messages: [
            {
              role: 'user',
              content: `Generate 5 alternative titles for this video idea:

Title: "${idea.title}"
${idea.description ? `Description: ${idea.description}` : ''}
${idea.conceptAnswers?.whoIsThisFor ? `Target audience: ${idea.conceptAnswers.whoIsThisFor}` : ''}

Respond with ONLY a JSON array of strings:
["title1", "title2", "title3", "title4", "title5"]`,
            },
          ],
        });

        trackAIUsage({ userId: user.id, feature: 'idea_alternative_titles', response, durationMs: Date.now() - startMs });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const titles = extractJsonFromResponse(text) as string[];

        return NextResponse.json({ alternativeTitles: Array.isArray(titles) ? titles : [] });
      }

      case 'outline': {
        // Gather all context for outline generation
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
        if (idea.callToAction) {
          conceptParts.push(`Call to action: ${idea.callToAction}`);
        }

        const resourceParts: string[] = [];
        if (idea.resources && idea.resources.length > 0) {
          for (const resource of idea.resources) {
            resourceParts.push(`[${resource.type}: ${resource.name}]\n${resource.content}`);
          }
        }

        const startMs = Date.now();
        const response = await client.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 2048,
          system: `You are a content strategist helping create a video outline. The outline MUST use the following structured markdown format with these exact section headings:\n\n## Hook\nA compelling opening that grabs attention in the first 5 seconds.\n\n## Part 1 - The Before\nSet up the problem, pain point, or current state the audience relates to.\n\n## Part 2 - The Solution\nPresent the key insight, method, or transformation.\n\n## Part 3 - The Payoff\nShow the result, proof, or call to action.\n\nEach section should have bullet points with specific talking points. Use markdown headings (##) and bullet points (-).\n\n${brandBrainContext}`,
          messages: [
            {
              role: 'user',
              content: `Create a detailed video outline for:

Title: "${idea.title}"
${idea.description ? `Description: ${idea.description}` : ''}
${conceptParts.length > 0 ? `\nConcept:\n${conceptParts.join('\n')}` : ''}
${resourceParts.length > 0 ? `\nResources provided by the creator:\n${resourceParts.join('\n\n')}` : ''}

Write the outline in markdown format using these sections: Hook, Part 1 - The Before, Part 2 - The Solution, Part 3 - The Payoff. Include bullet points under each section with specific talking points. The outline should guide the script generation that follows.`,
            },
          ],
        });
        trackAIUsage({ userId: user.id, feature: 'idea_outline', response, durationMs: Date.now() - startMs });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';

        return NextResponse.json({ outline: text });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in idea AI generation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
