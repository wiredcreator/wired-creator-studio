import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BugReport from '@/models/BugReport';
import { getAuthenticatedUser } from '@/lib/api-auth';

// POST /api/bug-reports — Submit a bug report
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    const body = await request.json();
    const { title, description, pageUrl, severity } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be 200 characters or less' },
        { status: 400 }
      );
    }

    if (description.length > 2000) {
      return NextResponse.json(
        { error: 'Description must be 2000 characters or less' },
        { status: 400 }
      );
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (severity && !validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: 'Invalid severity level' },
        { status: 400 }
      );
    }

    await dbConnect();

    const bugReport = await BugReport.create({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      title: title.trim(),
      description: description.trim(),
      pageUrl: pageUrl?.trim() || '',
      severity: severity || 'medium',
    });

    return NextResponse.json(bugReport, { status: 201 });
  } catch (error) {
    console.error('Error creating bug report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/bug-reports — List bug reports (admin only)
export async function GET() {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden — admin access required' },
        { status: 403 }
      );
    }

    await dbConnect();

    const reports = await BugReport.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ data: reports });
  } catch (error) {
    console.error('Error fetching bug reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
