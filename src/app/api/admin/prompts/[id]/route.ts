import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CustomPrompt from '@/models/CustomPrompt';
import { getAuthenticatedUser } from '@/lib/api-auth';

// PUT /api/admin/prompts/[id] — Update a custom prompt
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { name, category, promptText, isActive } = body;

    const validCategories = [
      'script_generation',
      'idea_generation',
      'side_quest_generation',
      'brain_dump_processing',
      'tone_of_voice',
    ];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    const updateFields: Record<string, unknown> = {};
    if (name !== undefined) updateFields.name = name;
    if (category !== undefined) updateFields.category = category;
    if (promptText !== undefined) updateFields.promptText = promptText;
    if (isActive !== undefined) updateFields.isActive = isActive;

    const updated = await CustomPrompt.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating custom prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/prompts/[id] — Delete a custom prompt
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const deleted = await CustomPrompt.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
