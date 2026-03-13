import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SideQuest from '@/models/SideQuest';

// PUT /api/side-quests/[id] — Mark complete or add response
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id } = await params;
    const body = await request.json();

    const quest = await SideQuest.findById(id);
    if (!quest) {
      return NextResponse.json(
        { error: 'Side quest not found' },
        { status: 404 }
      );
    }

    // Add response text
    if (body.response !== undefined) {
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

    return NextResponse.json(quest);
  } catch (error) {
    console.error('Error updating side quest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
