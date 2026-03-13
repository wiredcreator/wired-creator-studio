import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ContentIdea from '@/models/ContentIdea';
import { getAuthenticatedUser } from '@/lib/api-auth';

// PUT /api/ideas/[id] — Update an idea's status or details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { id } = await params;
    const body = await request.json();

    const idea = await ContentIdea.findById(id);
    if (!idea) {
      return NextResponse.json(
        { error: 'Content idea not found' },
        { status: 404 }
      );
    }

    // Ensure the user owns this idea (or is a coach/admin)
    if (idea.userId.toString() !== user.id && user.role === 'student') {
      return NextResponse.json(
        { error: 'Not authorized to update this idea' },
        { status: 403 }
      );
    }

    // Apply updates
    if (body.title !== undefined) idea.title = body.title;
    if (body.description !== undefined) idea.description = body.description;
    if (body.status !== undefined) idea.status = body.status;
    if (body.contentPillar !== undefined) idea.contentPillar = body.contentPillar;
    if (body.tags !== undefined) idea.tags = body.tags;
    if (body.trendData !== undefined) idea.trendData = body.trendData;

    await idea.save();

    return NextResponse.json(idea);
  } catch (error) {
    console.error('Error updating idea:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/ideas/[id] — Delete an idea
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { id } = await params;

    const idea = await ContentIdea.findById(id);
    if (!idea) {
      return NextResponse.json(
        { error: 'Content idea not found' },
        { status: 404 }
      );
    }

    // Ensure the user owns this idea (or is a coach/admin)
    if (idea.userId.toString() !== user.id && user.role === 'student') {
      return NextResponse.json(
        { error: 'Not authorized to delete this idea' },
        { status: 403 }
      );
    }

    await ContentIdea.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Idea deleted successfully' });
  } catch (error) {
    console.error('Error deleting idea:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
