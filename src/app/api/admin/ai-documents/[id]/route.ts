import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AIDocument, { AI_DOCUMENT_CATEGORIES } from '@/models/AIDocument';
import { getAuthenticatedUser } from '@/lib/api-auth';

// PUT /api/admin/ai-documents/[id]
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
    const { title, content, sortOrder, category } = body as {
      title?: string;
      content?: string;
      sortOrder?: number;
      category?: string;
    };

    if (category !== undefined && !AI_DOCUMENT_CATEGORIES.includes(category as typeof AI_DOCUMENT_CATEGORIES[number])) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${AI_DOCUMENT_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title.trim();
    if (content !== undefined) updates.content = content.trim();
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    if (category !== undefined) updates.category = category;

    await dbConnect();

    const doc = await AIDocument.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('userId', 'name email')
      .populate('createdBy', 'name email')
      .lean();

    if (!doc) {
      return NextResponse.json(
        { error: 'AI document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error('Error updating AI document:', error);
    return NextResponse.json(
      { error: 'Failed to update AI document' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/ai-documents/[id]
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

    const doc = await AIDocument.findByIdAndDelete(id);

    if (!doc) {
      return NextResponse.json(
        { error: 'AI document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting AI document:', error);
    return NextResponse.json(
      { error: 'Failed to delete AI document' },
      { status: 500 }
    );
  }
}
