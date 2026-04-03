import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AIDocument from '@/models/AIDocument';
import { getAuthenticatedUser } from '@/lib/api-auth';

// PUT /api/ai-documents/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    const { id } = await params;

    await dbConnect();

    const existing = await AIDocument.findById(id).lean();

    if (!existing) {
      return NextResponse.json(
        { error: 'AI document not found' },
        { status: 404 }
      );
    }

    if (String(existing.userId) !== String(user.id)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content } = body as {
      title?: string;
      content?: string;
    };

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title.trim();
    if (content !== undefined) updates.content = content.trim();

    const doc = await AIDocument.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error('Error updating AI document:', error);
    return NextResponse.json(
      { error: 'Failed to update AI document' },
      { status: 500 }
    );
  }
}

// DELETE /api/ai-documents/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    const { id } = await params;

    await dbConnect();

    const existing = await AIDocument.findById(id).lean();

    if (!existing) {
      return NextResponse.json(
        { error: 'AI document not found' },
        { status: 404 }
      );
    }

    if (String(existing.userId) !== String(user.id)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await AIDocument.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting AI document:', error);
    return NextResponse.json(
      { error: 'Failed to delete AI document' },
      { status: 500 }
    );
  }
}
