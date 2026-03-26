import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getAnthropicClient, CLAUDE_MODEL, extractJsonFromResponse } from '@/lib/ai/client';
import { withRetry } from '@/lib/retry';
import { assembleBrandBrainContext } from '@/lib/ai/brand-brain-context';

interface GeneratedScoutIdea {
  title: string;
  description: string;
}

// POST /api/content-scout/ideas — Generate ideas from a trending video
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const body = await request.json();
    const { videoUrl, videoTitle, videoDescription } = body as {
      videoUrl?: string;
      videoTitle?: string;
      videoDescription?: string;
    };

    if (!videoUrl && !videoTitle) {
      return NextResponse.json(
        { error: 'videoUrl or videoTitle is required' },
        { status: 400 }
      );
    }

    // Build Brand Brain context for personalized ideas
    const brandBrainContext = await assembleBrandBrainContext(user.id, {
      includeToneOfVoice: true,
      includeContentPillars: true,
      includeIndustryData: true,
      includeEquipmentProfile: false,
      includeTranscripts: false,
    });

    const client = getAnthropicClient();

    const videoContext = [
      videoTitle ? `**Title:** ${videoTitle}` : '',
      videoUrl ? `**URL:** ${videoUrl}` : '',
      videoDescription ? `**Description:** ${videoDescription}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const response = await withRetry(() =>
      client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        system: `You are a content strategist helping a creator generate unique content ideas inspired by trending videos. Your ideas should combine the trending topic with the student's unique perspective, expertise, and audience. Each idea should be distinct and actionable.`,
        messages: [
          {
            role: 'user',
            content: `## Trending Video
${videoContext}

${brandBrainContext || '(No Brand Brain context available — generate general ideas inspired by the video.)'}

Based on this trending video and the student's Brand Brain context, generate 3-5 unique content ideas the student could create. Each idea should combine the trending topic with the student's unique perspective, expertise, and audience.

Return a JSON array of objects with these fields:
- title: string (a compelling, specific video title)
- description: string (2-3 sentences explaining the angle and why it works for this creator)

Return ONLY the JSON array, no other text.`,
          },
        ],
      })
    );

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'Failed to generate ideas from AI' },
        { status: 500 }
      );
    }

    let ideas: GeneratedScoutIdea[];
    try {
      ideas = extractJsonFromResponse(textBlock.text) as GeneratedScoutIdea[];
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    if (!Array.isArray(ideas) || ideas.length === 0) {
      return NextResponse.json(
        { error: 'AI returned unexpected format' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ideas,
      sourceVideo: {
        url: videoUrl,
        title: videoTitle,
      },
    });
  } catch (error) {
    console.error('Error generating scout ideas:', error);
    return NextResponse.json(
      { error: 'Failed to generate ideas' },
      { status: 500 }
    );
  }
}
