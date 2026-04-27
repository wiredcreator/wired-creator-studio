import { NextRequest, NextResponse } from 'next/server';
import { aiLimiter, getRateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import dbConnect from '@/lib/db';
import CallTranscript from '@/models/CallTranscript';
import ContentIdea from '@/models/ContentIdea';
import BrandBrain from '@/models/BrandBrain';
import { processBrainDump } from '@/lib/ai/generate';
import { getAuthenticatedUser } from '@/lib/api-auth';

// POST /api/brain-dump/[id]/extract-more — Re-process transcript to extract additional ideas
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = aiLimiter.check(getRateLimitKey(request, 'brain-dump-extract'));
    if (!rl.success) return rateLimitResponse(rl.resetIn);

    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { id } = await params;
    const session = await CallTranscript.findById(id);
    if (!session) {
      return NextResponse.json(
        { error: 'Brain dump session not found' },
        { status: 404 }
      );
    }

    const isOwner = session.userId.toString() === user.id;
    const isPrivileged = user.role === 'admin';

    if (!isOwner && !isPrivileged) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Fetch content pillars
    let contentPillars: string[] = [];
    const brandBrain = await BrandBrain.findOne({ userId: session.userId }).lean();
    if (brandBrain && brandBrain.contentPillars) {
      contentPillars = brandBrain.contentPillars.map(
        (p: { title: string }) => p.title
      );
    }

    // Build context that tells Claude about existing ideas to avoid duplicates
    const existingIdeas = session.extractedIdeas
      .map((i) => `- ${i.title}: ${i.description}`)
      .join('\n');

    const augmentedTranscript = `${session.transcript}\n\n---\nIMPORTANT: The following ideas have ALREADY been extracted from this transcript. Generate DIFFERENT ideas that were not captured before. Look for subtler angles, secondary topics, contrarian takes, or spin-off ideas.\n\nAlready extracted:\n${existingIdeas}`;

    // Re-process with augmented context
    const extracted = await processBrainDump(augmentedTranscript, contentPillars, user.id);

    // Save new ideas to ContentIdea model
    const savedIdeas = [];
    for (const idea of extracted.contentIdeas) {
      const resources = idea.description ? [{
        type: 'text',
        source: 'written',
        name: 'AI-generated concept brief',
        content: idea.description,
      }] : [];
      const contentIdea = await ContentIdea.create({
        userId: session.userId,
        title: idea.title,
        description: idea.description,
        status: 'suggested',
        source: 'brain_dump',
        contentPillar: idea.contentPillar,
        tags: [],
        resources,
      });
      savedIdeas.push(contentIdea);
    }

    // Append new ideas to the session (don't replace existing)
    const newIdeas = extracted.contentIdeas.map((idea) => ({
      title: idea.title,
      description: idea.description,
    }));
    session.extractedIdeas = [...session.extractedIdeas, ...newIdeas];

    // Merge new themes (deduplicate)
    const newThemes = extracted.themes.map((t) => t.theme);
    const existingThemeSet = new Set(session.extractedThemes);
    for (const theme of newThemes) {
      if (!existingThemeSet.has(theme)) {
        session.extractedThemes.push(theme);
      }
    }

    await session.save();

    return NextResponse.json(
      {
        session,
        newIdeas: extracted.contentIdeas,
        newStories: extracted.stories,
        newThemes: extracted.themes,
        savedIdeas,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error extracting more ideas:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
