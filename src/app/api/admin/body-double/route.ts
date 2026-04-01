import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getAuthenticatedUser } from '@/lib/api-auth';

// GET /api/admin/body-double?studentId={id}
// Returns the current body double partner info for a student
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const student = await User.findById(studentId).select('bodyDoubleId').lean();
    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    if (!student.bodyDoubleId) {
      return NextResponse.json({ partner: null });
    }

    const partner = await User.findById(student.bodyDoubleId)
      .select('name email')
      .lean();

    return NextResponse.json({
      partner: partner ? { _id: partner._id, name: partner.name, email: partner.email } : null,
    });
  } catch (error) {
    console.error('Error fetching body double:', error);
    return NextResponse.json(
      { error: 'Failed to fetch body double info' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/body-double
// Assign or remove body double partner (bidirectional)
export async function PUT(req: NextRequest) {
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

    const body = await req.json();
    const { studentId, partnerId } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const student = await User.findById(studentId);
    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Removing assignment
    if (!partnerId) {
      // Clear the current partner's reference too
      if (student.bodyDoubleId) {
        await User.findByIdAndUpdate(student.bodyDoubleId, { bodyDoubleId: null });
      }
      student.bodyDoubleId = null;
      await student.save();

      return NextResponse.json({ success: true, partner: null });
    }

    // Assigning a new partner
    if (partnerId === studentId) {
      return NextResponse.json(
        { error: 'A student cannot be their own body double' },
        { status: 400 }
      );
    }

    const partner = await User.findById(partnerId);
    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Clear any existing partnerships first
    // If the student had an old partner, clear that old partner's reference
    if (student.bodyDoubleId && student.bodyDoubleId.toString() !== partnerId) {
      await User.findByIdAndUpdate(student.bodyDoubleId, { bodyDoubleId: null });
    }
    // If the new partner had an old partner, clear that old partner's reference
    if (partner.bodyDoubleId && partner.bodyDoubleId.toString() !== studentId) {
      await User.findByIdAndUpdate(partner.bodyDoubleId, { bodyDoubleId: null });
    }

    // Set bidirectional assignment
    student.bodyDoubleId = partner._id;
    partner.bodyDoubleId = student._id;
    await Promise.all([student.save(), partner.save()]);

    return NextResponse.json({
      success: true,
      partner: { _id: partner._id, name: partner.name, email: partner.email },
    });
  } catch (error) {
    console.error('Error updating body double:', error);
    return NextResponse.json(
      { error: 'Failed to update body double assignment' },
      { status: 500 }
    );
  }
}
