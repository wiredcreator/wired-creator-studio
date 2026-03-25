import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { getAuthenticatedUser } from '@/lib/api-auth';

// GET /api/notifications/count — Returns count of unretrieved notifications
export async function GET() {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const unretrieved = await Notification.countDocuments({
      userId: user.id,
      retrieved: false,
    });

    return NextResponse.json({ unretrieved });
  } catch (error) {
    console.error('Error counting notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
