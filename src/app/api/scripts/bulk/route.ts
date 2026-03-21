import { NextRequest, NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import dbConnect from '@/lib/db';
import Script from '@/models/Script';
import { getAuthenticatedUser } from '@/lib/api-auth';

const VALID_STATUSES = ['draft', 'review', 'approved', 'filming', 'completed'];

export async function PUT(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { scriptIds, status } = await request.json();

    if (!Array.isArray(scriptIds) || scriptIds.length === 0) {
      return NextResponse.json(
        { error: 'scriptIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    for (const id of scriptIds) {
      if (!isValidObjectId(id)) {
        return NextResponse.json(
          { error: `Invalid ID format: ${id}` },
          { status: 400 }
        );
      }
    }

    const filter: Record<string, unknown> = { _id: { $in: scriptIds } };
    if (user.role === 'student') {
      filter.userId = user.id;
    }

    const result = await Script.updateMany(filter, { $set: { status } });

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error bulk updating scripts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
