import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Script from '@/models/Script';
import ContentIdea from '@/models/ContentIdea';
// Ensure ContentIdea schema is registered for .populate('ideaId')
void ContentIdea;
import { createNotification, notifyAdmins } from '@/lib/notifications';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validateObjectId } from '@/lib/validation';

// GET /api/scripts/[id] — Get full script
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

    const script = await Script.findById(id)
      .populate('ideaId', 'title status contentPillar')
      .lean();

    if (!script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    const isOwner = script.userId.toString() === user.id;
    const isPrivileged = user.role === 'admin';

    if (!isOwner && !isPrivileged) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json(script);
  } catch (error) {
    console.error('Error fetching script:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/scripts/[id] — Update script content, status, or add feedback
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

    const script = await Script.findById(id);
    if (!script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    const isOwner = script.userId.toString() === user.id;
    const isPrivileged = user.role === 'admin';

    if (!isOwner && !isPrivileged) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Apply updates
    if (body.title !== undefined) script.title = body.title;
    if (body.fullScript !== undefined) script.fullScript = body.fullScript;
    if (body.bulletPoints !== undefined) script.bulletPoints = body.bulletPoints;
    if (body.teleprompterVersion !== undefined) script.teleprompterVersion = body.teleprompterVersion;
    if (body.status !== undefined) script.status = body.status;
    if (body.thumbnail !== undefined) script.thumbnail = body.thumbnail;
    if (body.sections !== undefined) script.sections = body.sections;
    if (body.platforms !== undefined) script.platforms = body.platforms;
    if (body.notes !== undefined) script.notes = body.notes;

    // Add feedback if provided
    if (body.feedback) {
      script.feedback.push({
        userId: user.id as any,
        text: body.feedback.text,
        createdAt: new Date(),
      });
    }

    // Increment version on content changes
    if (body.fullScript !== undefined || body.bulletPoints !== undefined || body.teleprompterVersion !== undefined || body.sections !== undefined) {
      script.version = (script.version || 1) + 1;
    }

    await script.save();

    // Fire-and-forget notifications on script status changes
    if (body.status === 'review') {
      // Student submitted for review, notify admins
      notifyAdmins({
        type: 'system',
        title: 'Script submitted for review',
        message: `A script was submitted for review: ${script.title}`,
        relatedId: script._id.toString(),
        relatedType: 'script',
        excludeUserId: user.id,
      });
    } else if (body.status === 'approved') {
      // Admin approved the script, notify the script owner
      const scriptOwnerId = script.userId.toString();
      if (scriptOwnerId !== user.id) {
        createNotification({
          userId: scriptOwnerId,
          type: 'system',
          title: 'Script approved',
          message: `Your script "${script.title}" has been approved!`,
          relatedId: script._id.toString(),
          relatedType: 'script',
        });
      }
    }

    return NextResponse.json(script);
  } catch (error) {
    console.error('Error updating script:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/scripts/[id] — Remove script
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

    const script = await Script.findById(id);
    if (!script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    const isOwner = script.userId.toString() === user.id;
    const isPrivileged = user.role === 'admin';

    if (!isOwner && !isPrivileged) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await (script as any).softDelete(user.id);

    return NextResponse.json({ message: 'Script deleted successfully' });
  } catch (error) {
    console.error('Error deleting script:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
