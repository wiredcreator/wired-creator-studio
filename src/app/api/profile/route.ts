import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getAuthenticatedUser } from '@/lib/api-auth';

// Fields that users are allowed to update via PUT
const ALLOWED_FIELDS = new Set([
  'name',
  'background',
  'neurodivergentProfile',
  'contentGoals',
  'timezone',
]);

export async function GET() {
  try {
    const result = await getAuthenticatedUser();
    if (result instanceof NextResponse) return result;
    const user = result;

    await dbConnect();

    const dbUser = await User.findById(user.id).select('-password');

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: dbUser });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const result = await getAuthenticatedUser();
    if (result instanceof NextResponse) return result;
    const user = result;

    const body = await req.json();

    // Only allow whitelisted fields
    const updates: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    await dbConnect();

    const updatedUser = await User.findByIdAndUpdate(
      user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
