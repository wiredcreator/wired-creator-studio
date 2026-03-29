import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CallTranscript from '@/models/CallTranscript';
import ContentIdea from '@/models/ContentIdea';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validateObjectId } from '@/lib/validation';

// GET /api/brain-dump/[id] — Get a specific brain dump session
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { id } = await params;
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;
    const session = await CallTranscript.findById(id).lean();

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

// PUT /api/brain-dump/[id] — Update a brain dump session (admin edits)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { id } = await params;
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;
    const body = await request.json();
    const { extractedIdeas, extractedStories, extractedThemes, priority, tags, transcript } = body;

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
    if (priority !== undefined) {
      const validPriorities = ['high', 'medium', 'low'];
      if (validPriorities.includes(priority)) {
        session.priority = priority;
      }
    }
    if (tags !== undefined && Array.isArray(tags)) {
      session.tags = tags.map((t: string) => String(t).trim()).filter(Boolean);
    }
    if (transcript !== undefined) {
      session.transcript = transcript;
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

// DELETE /api/brain-dump/[id] — Delete a brain dump session
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { id } = await params;
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

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

    await session.deleteOne();

    return NextResponse.json({ message: 'Brain dump session deleted successfully' });
  } catch (error) {
    console.error('Error deleting brain dump session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
