import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CallTranscript from '@/models/CallTranscript';
import ContentIdea from '@/models/ContentIdea';

// GET /api/brain-dump/[id] — Get a specific brain dump session
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id } = await params;
    const session = await CallTranscript.findById(id).lean();

    if (!session) {
      return NextResponse.json(
        { error: 'Brain dump session not found' },
        { status: 404 }
      );
    }

    // Also fetch associated content ideas
    const ideas = await ContentIdea.find({
      userId: session.userId,
      source: 'brain_dump',
      title: { $in: session.extractedIdeas.map((i: { title: string }) => i.title) },
    }).lean();

    return NextResponse.json({ session, ideas });
  } catch (error) {
    console.error('Error fetching brain dump session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/brain-dump/[id] — Update a brain dump session (coach edits)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id } = await params;
    const body = await request.json();
    const { extractedIdeas, extractedStories, extractedThemes } = body;

    const session = await CallTranscript.findById(id);
    if (!session) {
      return NextResponse.json(
        { error: 'Brain dump session not found' },
        { status: 404 }
      );
    }

    // Update the extracted data if provided
    if (extractedIdeas !== undefined) {
      session.extractedIdeas = extractedIdeas;
    }
    if (extractedStories !== undefined) {
      session.extractedStories = extractedStories;
    }
    if (extractedThemes !== undefined) {
      session.extractedThemes = extractedThemes;
    }

    await session.save();

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error updating brain dump session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
