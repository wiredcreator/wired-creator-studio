import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import dbConnect from '@/lib/db';
import AIDocument from '@/models/AIDocument';
import { STUDENT_PROFILE_TEMPLATE } from '@/lib/ai/student-profile-template';

// POST /api/admin/seed-student-profile-template
export async function POST() {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    if (authResult.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await dbConnect();

    const existing = await AIDocument.findOne({
      category: 'student_profile',
      scope: 'global',
    });

    if (existing) {
      await AIDocument.updateOne(
        { _id: existing._id },
        { $set: { content: STUDENT_PROFILE_TEMPLATE, title: 'Student Profile Template' } }
      );
      return NextResponse.json({ message: 'Updated existing student profile template.' });
    }

    await AIDocument.create({
      category: 'student_profile',
      scope: 'global',
      userId: null,
      title: 'Student Profile Template',
      content: STUDENT_PROFILE_TEMPLATE,
      sortOrder: 0,
      createdBy: authResult.id,
    });

    return NextResponse.json({ message: 'Student Profile Template seeded successfully.' });
  } catch (err) {
    console.error('[seed-student-profile] Error:', err);
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
