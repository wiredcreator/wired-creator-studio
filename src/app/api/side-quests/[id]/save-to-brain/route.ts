import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SideQuest from '@/models/SideQuest';
import BrandBrain from '@/models/BrandBrain';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validateObjectId } from '@/lib/validation';

// POST /api/side-quests/[id]/save-to-brain — Save completed quest response to Brand Brain
export async function POST(
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
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Quest must be completed with a response
    if (!quest.completed || !quest.response) {
      return NextResponse.json(
        { error: 'Quest must be completed with a response before saving to Brand Brain' },
        { status: 400 }
      );
    }

    // Prevent duplicate saves
    if (quest.savedToBrandBrain) {
      return NextResponse.json(
        { error: 'Already saved to Brand Brain' },
        { status: 409 }
      );
    }

    // Find or create the user's Brand Brain
    let brandBrain = await BrandBrain.findOne({ userId: user.id });
    if (!brandBrain) {
      brandBrain = new BrandBrain({ userId: user.id });
    }

    // Add the side quest insight
    brandBrain.sideQuestInsights.push({
      questTitle: quest.title,
      questType: quest.type,
      response: quest.response,
      savedAt: new Date(),
    });

    await brandBrain.save();

    // Mark the quest as saved
    quest.savedToBrandBrain = true;
    await quest.save();

    return NextResponse.json({
      success: true,
      message: 'Response saved to Brand Brain',
    });
  } catch (error) {
    console.error('Error saving side quest to Brand Brain:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
