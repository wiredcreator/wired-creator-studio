import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getAuthenticatedUser } from '@/lib/api-auth';

// GET /api/admin/team — List all team members (coach/admin users)
export async function GET() {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    if (user.role !== 'coach' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    await dbConnect();

    const teamMembers = await User.find({ role: { $in: ['coach', 'admin'] } })
      .select('name email role createdAt')
      .sort({ role: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({ team: teamMembers });
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

// POST /api/admin/team — Promote an existing user to coach/admin
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can manage team roles' },
        { status: 403 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const { email, role } = body as { email?: string; role?: string };

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    if (role !== 'coach' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Role must be "coach" or "admin"' },
        { status: 400 }
      );
    }

    const targetUser = await User.findOne({ email: email.toLowerCase() });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'No account found with that email. The user must sign up first.' },
        { status: 404 }
      );
    }

    if (targetUser.role === role) {
      return NextResponse.json(
        { error: `${targetUser.name} is already a ${role}` },
        { status: 409 }
      );
    }

    targetUser.role = role;
    await targetUser.save();

    return NextResponse.json({
      success: true,
      member: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        createdAt: targetUser.createdAt,
      },
    });
  } catch (error) {
    console.error('Error promoting user:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}
