import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ContentIdea from '@/models/ContentIdea';
import BrandBrain from '@/models/BrandBrain';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validateObjectId } from '@/lib/validation';

// GET /api/ideas/[id] — Fetch a single idea by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { id } = await params;
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

    const idea = await ContentIdea.findById(id);
    if (!idea) {
      return NextResponse.json(
        { error: 'Content idea not found' },
        { status: 404 }
      );
    }

    if (user.role === 'student' && idea.userId.toString() !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to view this idea' },
        { status: 403 }
      );
    }

    return NextResponse.json(idea);
  } catch (error) {
    console.error('Error fetching idea:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;
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
    if (body.status !== undefined) {
      idea.status = body.status;
      // Track approval/rejection timestamps
      if (body.status === 'approved') {
        idea.approvedAt = new Date();
      } else if (body.status === 'rejected') {
        idea.rejectedAt = new Date();
        if (body.rejectionReason) {
          idea.rejectionReason = body.rejectionReason;
        }
      }

      // --- Write back to Brand Brain ---
      try {
        if (body.status === 'approved') {
          await BrandBrain.findOneAndUpdate(
            { userId: idea.userId },
            { $addToSet: { approvedIdeas: idea._id } }
          );
        } else {
          // If status changed away from approved, remove from Brand Brain
          await BrandBrain.findOneAndUpdate(
            { userId: idea.userId },
            { $pull: { approvedIdeas: idea._id } }
          );
        }
      } catch (bbError) {
        console.error('[Ideas] Brand Brain write-back failed (non-fatal):', bbError);
      }
    }
    if (body.contentPillar !== undefined) idea.contentPillar = body.contentPillar;
    if (body.tags !== undefined) idea.tags = body.tags;
    if (body.trendData !== undefined) idea.trendData = body.trendData;
    if (body.conceptAnswers !== undefined) idea.conceptAnswers = body.conceptAnswers;
    if (body.callToAction !== undefined) idea.callToAction = body.callToAction;
    if (body.alternativeTitles !== undefined) idea.alternativeTitles = body.alternativeTitles;
    if (body.resources !== undefined) idea.resources = body.resources;
    if (body.outline !== undefined) idea.outline = body.outline;

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
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

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

    await (idea as any).softDelete(user.id);

    return NextResponse.json({ message: 'Idea deleted successfully' });
  } catch (error) {
    console.error('Error deleting idea:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
