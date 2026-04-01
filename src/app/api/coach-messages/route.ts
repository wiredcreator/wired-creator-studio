import { NextRequest, NextResponse } from 'next/server';
import { createNotification } from '@/lib/notifications';
import { getAuthenticatedUser } from '@/lib/api-auth';

// POST /api/coach-messages — Send a coach message/note to a student
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    // Only admins (coaches) can send coach messages
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only coaches can send messages' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { studentId, title, message } = body;

    if (!studentId || !message) {
      return NextResponse.json(
        { error: 'studentId and message are required' },
        { status: 400 }
      );
    }

    // Fire-and-forget notification to the student
    createNotification({
      userId: studentId,
      type: 'coach_message',
      title: title || `Message from ${user.name}`,
      message: message.length > 200 ? message.slice(0, 200) + '...' : message,
      relatedId: user.id,
      relatedType: 'coach_message',
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error sending coach message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
