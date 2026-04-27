import { NextRequest, NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import ContentIdea from '@/models/ContentIdea';
import { getAuthenticatedUser } from '@/lib/api-auth';

const VALID_STATUSES = ['suggested', 'approved', 'rejected', 'saved', 'scripted', 'filmed', 'published'];

// DELETE /api/ideas/bulk — Delete ideas by status (e.g. clear all suggested)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { status } = await request.json();

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    const filter: Record<string, unknown> = { status };
    if (user.role === 'student') {
      filter.userId = user.id;
    } else {
      // Admins must provide a userId to avoid accidentally deleting all users' ideas
      const targetUserId = request.nextUrl.searchParams.get('userId');
      if (targetUserId) {
        filter.userId = targetUserId;
      } else {
        filter.userId = user.id;
      }
    }

    const result = await ContentIdea.deleteMany(filter);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error bulk deleting ideas:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { ideaIds, status } = await request.json();

    if (!Array.isArray(ideaIds) || ideaIds.length === 0) {
      return NextResponse.json(
        { error: 'ideaIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate all IDs
    for (const id of ideaIds) {
      if (!isValidObjectId(id)) {
        return NextResponse.json(
          { error: `Invalid ID format: ${id}` },
          { status: 400 }
        );
      }
    }

    const filter: Record<string, unknown> = { _id: { $in: ideaIds } };
    if (user.role === 'student') {
      filter.userId = user.id;
    }

    const updateFields: Record<string, unknown> = { status };
    if (status === 'approved') updateFields.approvedAt = new Date();
    if (status === 'rejected') updateFields.rejectedAt = new Date();

    const result = await ContentIdea.updateMany(filter, { $set: updateFields });

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error bulk updating ideas:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
