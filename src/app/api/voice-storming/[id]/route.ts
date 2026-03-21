import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import VoiceStormingTranscript from '@/models/VoiceStormingTranscript';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validateObjectId } from '@/lib/validation';

// GET /api/voice-storming/[id] — Get a single voice-storming session
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

    const session = await VoiceStormingTranscript.findById(id).lean();

    if (!session) {
      return NextResponse.json(
        { error: 'Voice storming session not found' },
        { status: 404 }
      );
    }

    const isOwner = session.userId.toString() === user.id;
    const isPrivileged = user.role === 'coach' || user.role === 'admin';

    if (!isOwner && !isPrivileged) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error fetching voice-storming session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/voice-storming/[id] — Update a voice-storming session
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

    const session = await VoiceStormingTranscript.findById(id);

    if (!session) {
      return NextResponse.json(
        { error: 'Voice storming session not found' },
        { status: 404 }
      );
    }

    const isOwner = session.userId.toString() === user.id;
    const isPrivileged = user.role === 'coach' || user.role === 'admin';

    if (!isOwner && !isPrivileged) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      transcript,
      sessionType,
      linkedIdeaIds,
      extractedInsights,
      duration,
      promptUsed,
    } = body;

    if (title !== undefined) session.title = title;
    if (transcript !== undefined) session.transcript = transcript;
    if (sessionType !== undefined) session.sessionType = sessionType;
    if (linkedIdeaIds !== undefined) session.linkedIdeaIds = linkedIdeaIds;
    if (extractedInsights !== undefined) session.extractedInsights = extractedInsights;
    if (duration !== undefined) session.duration = duration;
    if (promptUsed !== undefined) session.promptUsed = promptUsed;

    await session.save();

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error updating voice-storming session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/voice-storming/[id] — Remove a voice-storming session
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

    const session = await VoiceStormingTranscript.findById(id);

    if (!session) {
      return NextResponse.json(
        { error: 'Voice storming session not found' },
        { status: 404 }
      );
    }

    const isOwner = session.userId.toString() === user.id;
    const isPrivileged = user.role === 'coach' || user.role === 'admin';

    if (!isOwner && !isPrivileged) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await VoiceStormingTranscript.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Session deleted' });
  } catch (error) {
    console.error('Error deleting voice-storming session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
