import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validateObjectId } from '@/lib/validation';

// DELETE /api/admin/team/[id] — Remove from team (demote to student)
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
        { error: 'Only admins can remove team members' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

    if (id === user.id) {
      return NextResponse.json(
        { error: 'You cannot remove yourself from the team' },
        { status: 400 }
      );
    }

    await dbConnect();

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (targetUser.role === 'student') {
      return NextResponse.json(
        { error: 'This user is already a student' },
        { status: 400 }
      );
    }

    targetUser.role = 'student';
    await targetUser.save();

    return NextResponse.json({
      success: true,
      message: `${targetUser.name} has been removed from the team`,
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
