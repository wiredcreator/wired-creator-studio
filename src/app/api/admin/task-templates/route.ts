import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import TaskTemplate from '@/models/TaskTemplate';
import { getAuthenticatedUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const weekNumber = searchParams.get('weekNumber');

    const filter: Record<string, unknown> = {};
    if (weekNumber) {
      filter.weekNumber = Number(weekNumber);
    }

    const templates = await TaskTemplate.find(filter)
      .sort({ weekNumber: 1, order: 1 })
      .lean();

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching task templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { weekNumber, title, description, type, dayOfWeek, order, embeddedVideoUrl } = body;

    if (!weekNumber || !title || !type || dayOfWeek == null) {
      return NextResponse.json(
        { error: 'weekNumber, title, type, and dayOfWeek are required' },
        { status: 400 }
      );
    }

    const template = await TaskTemplate.create({
      weekNumber,
      title,
      description: description || '',
      type,
      dayOfWeek,
      order: order || 0,
      embeddedVideoUrl: embeddedVideoUrl || undefined,
      createdBy: user.id,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating task template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
