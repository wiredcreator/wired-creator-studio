import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SideQuest from '@/models/SideQuest';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validateObjectId } from '@/lib/validation';
import { awardXP } from '@/lib/xp-service';

// PUT /api/side-quests/[id] — Mark complete or add response
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

    const quest = await SideQuest.findById(id);
    if (!quest) {
      return NextResponse.json(
        { error: 'Side quest not found' },
        { status: 404 }
      );
    }

    // Ensure user owns this side quest
    if (quest.userId.toString() !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to update this side quest' },
        { status: 403 }
      );
    }

    // Add response text
    if (body.response !== undefined) {
      if (typeof body.response !== 'string') {
        return NextResponse.json({ error: 'Response must be a string' }, { status: 400 });
      }
      if (body.response.length > 10000) {
        return NextResponse.json({ error: 'Response too long (max 10,000 characters)' }, { status: 400 });
      }
      quest.response = body.response;
    }

    // Mark complete
    if (body.completed !== undefined) {
      quest.completed = body.completed;
      if (body.completed) {
        quest.completedAt = new Date();
      } else {
        quest.completedAt = undefined;
      }
    }

    await quest.save();

    // Fire-and-forget XP award when side quest is completed
    if (body.completed === true) {
      awardXP(user.id, 'complete_side_quest', { questId: id }).catch((err) =>
        console.error('[XP] Failed to award complete_side_quest XP:', err)
      );
    }

    return NextResponse.json(quest);
  } catch (error) {
    console.error('Error updating side quest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
