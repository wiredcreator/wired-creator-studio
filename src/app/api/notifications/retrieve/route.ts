import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { getAuthenticatedUser } from '@/lib/api-auth';

// POST /api/notifications/retrieve — Mark all unretrieved notifications as retrieved
// Returns the newly retrieved notifications
export async function POST() {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    // Find unretrieved notifications before updating
    const unretrieved = await Notification.find({
      userId: user.id,
      retrieved: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Mark them all as retrieved
    if (unretrieved.length > 0) {
      const ids = unretrieved.map((n) => n._id);
      await Notification.updateMany(
        { _id: { $in: ids } },
        { $set: { retrieved: true } }
      );
    }

    return NextResponse.json({ notifications: unretrieved, count: unretrieved.length });
  } catch (error) {
    console.error('Error retrieving notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
