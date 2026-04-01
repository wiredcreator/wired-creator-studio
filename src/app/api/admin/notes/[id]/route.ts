import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CoachNote from '@/models/CoachNote';
import { getAuthenticatedUser } from '@/lib/api-auth';

// PUT /api/admin/notes/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { text } = body as { text?: string };

    if (!text?.trim()) {
      return NextResponse.json(
        { error: 'text is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const note = await CoachNote.findByIdAndUpdate(
      id,
      { text: text.trim() },
      { new: true }
    )
      .populate('authorId', 'name')
      .lean();

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Error updating coach note:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/notes/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;

    await dbConnect();

    const note = await CoachNote.findByIdAndDelete(id);

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting coach note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
