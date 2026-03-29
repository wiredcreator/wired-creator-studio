import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import ContentIdea from '@/models/ContentIdea';
import Script from '@/models/Script';
import { getAuthenticatedUser } from '@/lib/api-auth';

export async function GET() {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const userId = user.id;

    // Fetch all counts in parallel
    const [taskCount, ideaCount, scriptCount, readyToFilmCount] = await Promise.all([
      Task.countDocuments({ userId }),
      ContentIdea.countDocuments({ userId }),
      Script.countDocuments({ userId }),
      Script.countDocuments({ userId, status: 'approved' }),
    ]);

    return NextResponse.json({
      tasks: taskCount,
      ideas: ideaCount,
      scripts: scriptCount,
      readyToFilm: readyToFilmCount,
      userName: user.name,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
