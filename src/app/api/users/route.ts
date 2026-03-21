import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getAuthenticatedUser } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  try {
    // Authenticate
    const result = await getAuthenticatedUser();
    if (result instanceof NextResponse) return result; // 401
    const user = result;

    // Only coaches and admins can list users
    if (user.role !== 'coach' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    // Fetch a single user by ID
    if (userId) {
      const foundUser = await User.findById(userId).select('-password');

      if (!foundUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ user: foundUser });
    }

    // Build filter for listing users
    const filter: Record<string, string> = {};
    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
