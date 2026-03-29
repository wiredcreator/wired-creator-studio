import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { getAuthenticatedUser } from '@/lib/api-auth';

// GET /api/notifications — Returns notifications for the authenticated user
// Query params: ?retrieved=true (default) returns retrieved ones, ?retrieved=false returns unretrieved
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const retrievedParam = request.nextUrl.searchParams.get('retrieved');
    // Default: return retrieved notifications
    const retrieved = retrievedParam === 'false' ? false : true;

    const notifications = await Notification.find({
      userId: user.id,
      retrieved,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/notifications — Create a notification (internal use)
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    // Only admins can create notifications for other users
    const body = await request.json();
    const { userId, type, title, message, relatedId, relatedType } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'userId, type, title, and message are required' },
        { status: 400 }
      );
    }

    // Students can only create notifications for themselves (shouldn't normally happen)
    if (user.role === 'student' && userId !== user.id) {
      return NextResponse.json(
        { error: 'Cannot create notifications for other users' },
        { status: 403 }
      );
    }

    await dbConnect();

    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      relatedId,
      relatedType,
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
