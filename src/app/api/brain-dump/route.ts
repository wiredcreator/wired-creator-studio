import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CallTranscript from '@/models/CallTranscript';
import ContentIdea from '@/models/ContentIdea';
import BrandBrain from '@/models/BrandBrain';
import { processBrainDump } from '@/lib/ai/generate';

// POST /api/brain-dump — Submit a brain dump transcript for processing
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { transcript, userId, callType } = body;

    if (!transcript || !userId) {
      return NextResponse.json(
        { error: 'transcript and userId are required' },
        { status: 400 }
      );
    }

    const validCallTypes = ['1on1_coaching', 'brain_dump', 'support', 'other'];
    const resolvedCallType = validCallTypes.includes(callType)
      ? callType
      : 'brain_dump';

    // Save the transcript
    const callTranscript = await CallTranscript.create({
      userId,
      source: 'manual',
      callType: resolvedCallType,
      transcript,
      callDate: new Date(),
      extractedIdeas: [],
      extractedStories: [],
      extractedThemes: [],
      ingestedIntoBrandBrain: false,
    });

    // Fetch the user's content pillars from Brand Brain
    let contentPillars: string[] = [];
    const brandBrain = await BrandBrain.findOne({ userId }).lean();
    if (brandBrain && brandBrain.contentPillars) {
      contentPillars = brandBrain.contentPillars.map(
        (p: { title: string }) => p.title
      );
    }

    // Process the transcript with AI
    const extracted = await processBrainDump(transcript, contentPillars);

    // Save extracted ideas to ContentIdea model
    const savedIdeas = [];
    for (const idea of extracted.contentIdeas) {
      const contentIdea = await ContentIdea.create({
        userId,
        title: idea.title,
        description: idea.description,
        status: 'suggested',
        source: 'brain_dump',
        contentPillar: idea.contentPillar,
        tags: [],
      });
      savedIdeas.push(contentIdea);
    }

    // Update the CallTranscript with extracted data
    callTranscript.extractedIdeas = extracted.contentIdeas.map((idea) => ({
      title: idea.title,
      description: idea.description,
    }));
    callTranscript.extractedStories = extracted.stories.map((story) => ({
      summary: story.summary,
      fullText: story.fullText,
    }));
    callTranscript.extractedThemes = extracted.themes.map((t) => t.theme);
    callTranscript.ingestedIntoBrandBrain = true;
    await callTranscript.save();

    return NextResponse.json(
      {
        session: callTranscript,
        extracted,
        savedIdeas,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing brain dump:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/brain-dump — List brain dump sessions for a user
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    const sessions = await CallTranscript.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching brain dump sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
