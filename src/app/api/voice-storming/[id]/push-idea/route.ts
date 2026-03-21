import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import VoiceStormingTranscript from '@/models/VoiceStormingTranscript';
import ContentIdea from '@/models/ContentIdea';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validateObjectId } from '@/lib/validation';

export async function POST(
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
    const { insightId } = body;

    if (!insightId) {
      return NextResponse.json(
        { error: 'insightId is required' },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find the insight by _id
    const insight = session.extractedInsights.find(
      (i: { _id?: { toString(): string }; type: string; content: string; contentPillar: string }) =>
        i._id?.toString() === insightId
    );

    if (!insight) {
      return NextResponse.json(
        { error: 'Insight not found' },
        { status: 404 }
      );
    }

    if (insight.type !== 'idea') {
      return NextResponse.json(
        { error: 'Only idea-type insights can be pushed to the ideas pipeline' },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existing = await ContentIdea.findOne({
      sourceSessionId: session._id,
      title: insight.content,
      userId: session.userId,
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This idea has already been pushed', ideaId: existing._id },
        { status: 409 }
      );
    }

    const idea = await ContentIdea.create({
      userId: session.userId,
      title: insight.content,
      description: '',
      status: 'suggested',
      source: 'voice_storm',
      contentPillar: insight.contentPillar || '',
      sourceSessionId: session._id,
      tags: [],
    });

    return NextResponse.json({ success: true, ideaId: idea._id }, { status: 201 });
  } catch (error) {
    console.error('Error pushing idea:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
