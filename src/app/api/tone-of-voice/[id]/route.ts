import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ToneOfVoiceGuide from '@/models/ToneOfVoiceGuide';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validateObjectId } from '@/lib/validation';

// GET /api/tone-of-voice/[id] — Fetch a specific ToneOfVoiceGuide by ID
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
    const guide = await ToneOfVoiceGuide.findById(id).lean();

    if (!guide) {
      return NextResponse.json(
        { error: 'Tone of Voice Guide not found' },
        { status: 404 }
      );
    }

    // Students can only view their own guide
    if (user.role === 'student' && guide.userId.toString() !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to view this guide' },
        { status: 403 }
      );
    }

    return NextResponse.json(guide);
  } catch (error) {
    console.error('Error fetching Tone of Voice Guide:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/tone-of-voice/[id] — Update a ToneOfVoiceGuide
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

    const guide = await ToneOfVoiceGuide.findById(id);

    if (!guide) {
      return NextResponse.json(
        { error: 'Tone of Voice Guide not found' },
        { status: 404 }
      );
    }

    // Ownership / role check: students can update their own guide; admin can update any
    const isOwner = guide.userId.toString() === user.id;
    const isPrivileged = user.role === 'admin';
    if (!isOwner && !isPrivileged) {
      return NextResponse.json(
        { error: 'Not authorized to update this guide' },
        { status: 403 }
      );
    }

    // Coach/admin can update status and parameters
    if (body.status !== undefined) {
      const validTransitions: Record<string, string[]> = {
        draft: ['review', 'active'],
        review: ['draft', 'active'],
        active: ['review', 'draft'],
      };

      const allowed = validTransitions[guide.status] || [];
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          { error: `Cannot transition from '${guide.status}' to '${body.status}'` },
          { status: 400 }
        );
      }

      guide.status = body.status;
    }

    if (body.parameters !== undefined) {
      guide.parameters = body.parameters;
    }

    if (body.summary !== undefined) {
      guide.summary = body.summary;
    }
    // Auto-approve: when a user edits their own guide, set status to active
    if (isOwner && guide.status !== 'active') {
      guide.status = 'active';
    }

    // Increment version on each save
    guide.version += 1;

    await guide.save();

    return NextResponse.json(guide);
  } catch (error) {
    console.error('Error updating Tone of Voice Guide:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tone-of-voice/[id] — Delete a ToneOfVoiceGuide
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

    const guide = await ToneOfVoiceGuide.findById(id);

    if (!guide) {
      return NextResponse.json(
        { error: 'Tone of Voice Guide not found' },
        { status: 404 }
      );
    }

    // Ownership check
    const isOwner = guide.userId.toString() === user.id;
    const isPrivileged = user.role === 'admin';
    if (!isOwner && !isPrivileged) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await guide.deleteOne();

    return NextResponse.json({ message: 'Tone of Voice guide deleted' });
  } catch (error) {
    console.error('Error deleting Tone of Voice Guide:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
