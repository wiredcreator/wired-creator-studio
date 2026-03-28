import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ContentIdea from '@/models/ContentIdea';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { parsePagination, paginationResponse } from '@/lib/pagination';
import { awardXP } from '@/lib/xp-service';

// GET /api/ideas — List ideas with optional status filter
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const status = request.nextUrl.searchParams.get('status');
    const source = request.nextUrl.searchParams.get('source');
    const pillar = request.nextUrl.searchParams.get('contentPillar');

    // Coaches/admins can look up any student's ideas via ?userId=
    let targetUserId = user.id;
    const requestedUserId = request.nextUrl.searchParams.get('userId');
    if (requestedUserId && (user.role === 'coach' || user.role === 'admin')) {
      targetUserId = requestedUserId;
    }

    // Build query filter
    const filter: Record<string, unknown> = { userId: targetUserId };
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (pillar) filter.contentPillar = pillar;

    const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);

    const [ideas, total] = await Promise.all([
      ContentIdea.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContentIdea.countDocuments(filter),
    ]);

    return NextResponse.json(paginationResponse(ideas, total, page, limit));
  } catch (error) {
    console.error('Error fetching ideas:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/ideas — Create a new content idea
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const body = await request.json();
    const { title, source } = body;

    if (!title || !source) {
      return NextResponse.json(
        { error: 'title and source are required' },
        { status: 400 }
      );
    }

    const idea = await ContentIdea.create({
      userId: user.id,
      title,
      description: body.description || '',
      status: body.status || 'suggested',
      source,
      trendData: body.trendData,
      contentPillar: body.contentPillar || '',
      tags: body.tags || [],
    });

    // Fire-and-forget XP award
    awardXP(user.id, 'generate_idea', { ideaId: idea._id.toString() }).catch((err) =>
      console.error('[XP] Failed to award generate_idea XP:', err)
    );

    return NextResponse.json(idea, { status: 201 });
  } catch (error) {
    console.error('Error creating idea:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
