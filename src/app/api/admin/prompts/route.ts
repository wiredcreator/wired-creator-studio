import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CustomPrompt from '@/models/CustomPrompt';
import { getAuthenticatedUser } from '@/lib/api-auth';

// GET /api/admin/prompts — List all custom prompts
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

    const category = request.nextUrl.searchParams.get('category');
    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;

    const prompts = await CustomPrompt.find(filter)
      .sort({ category: 1, createdAt: -1 })
      .lean();

    return NextResponse.json(prompts);
  } catch (error) {
    console.error('Error fetching custom prompts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/prompts — Create a new custom prompt
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
    const { name, category, promptText, isActive } = body;

    if (!name || !category || !promptText) {
      return NextResponse.json(
        { error: 'name, category, and promptText are required' },
        { status: 400 }
      );
    }

    const validCategories = [
      'script_generation',
      'idea_generation',
      'side_quest_generation',
      'brain_dump_processing',
      'tone_of_voice',
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    const prompt = await CustomPrompt.create({
      name,
      category,
      promptText,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: user.id,
    });

    return NextResponse.json(prompt, { status: 201 });
  } catch (error) {
    console.error('Error creating custom prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
