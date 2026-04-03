import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import ContentDNAResponse from '@/models/ContentDNAResponse';
import { getAuthenticatedUser } from '@/lib/api-auth';

// POST /api/admin/compile-all-profiles
// Returns all student user IDs who have completed onboarding (have a ContentDNAResponse).
// The frontend loops through these and calls /api/compile-profile for each.
export async function POST() {
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

    await dbConnect();

    // Fetch all student user IDs
    const students = await User.find({ role: 'student' })
      .select('_id')
      .lean();

    if (students.length === 0) {
      return NextResponse.json({ userIds: [] });
    }

    const studentIds = students.map((s) => s._id);

    // A student has completed onboarding if they have a ContentDNAResponse record
    const completedRecords = await ContentDNAResponse.find({
      userId: { $in: studentIds },
    })
      .select('userId')
      .lean();

    const userIds = completedRecords.map((r) => r.userId.toString());

    return NextResponse.json({ userIds });
  } catch (error) {
    console.error('Error fetching eligible students for profile compilation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch eligible students' },
      { status: 500 }
    );
  }
}
