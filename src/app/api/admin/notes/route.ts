import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CoachNote from '@/models/CoachNote';
import { getAuthenticatedUser } from '@/lib/api-auth';

// GET /api/admin/notes?studentId={id}
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const notes = await CoachNote.find({ studentId })
      .populate('authorId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error fetching coach notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

// POST /api/admin/notes
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { studentId, text } = body as { studentId?: string; text?: string };

    if (!studentId || !text?.trim()) {
      return NextResponse.json(
        { error: 'studentId and text are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const note = await CoachNote.create({
      studentId,
      authorId: user.id,
      text: text.trim(),
    });

    // Return the note with author info populated
    const populated = await CoachNote.findById(note._id)
      .populate('authorId', 'name')
      .lean();

    return NextResponse.json({ note: populated }, { status: 201 });
  } catch (error) {
    console.error('Error creating coach note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
