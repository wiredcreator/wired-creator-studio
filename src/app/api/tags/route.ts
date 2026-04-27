import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api-auth';
import UserTagLibrary from '@/models/UserTagLibrary';

// GET /api/tags — Get user's saved tag library
export async function GET() {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const library = await UserTagLibrary.findOne({ userId: user.id }).lean();

    return NextResponse.json({
      tags: library?.tags || [],
    });
  } catch (error) {
    console.error('Error fetching tag library:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

// PUT /api/tags — Add or update a saved tag
export async function PUT(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const body = await request.json();
    const { name, color } = body as { name?: string; color?: string };

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    if (!color || typeof color !== 'string') {
      return NextResponse.json(
        { error: 'Tag color is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim().toLowerCase();

    // Upsert: create library if missing, update tag color if exists, add if new
    const library = await UserTagLibrary.findOne({ userId: user.id });

    if (!library) {
      await UserTagLibrary.create({
        userId: user.id,
        tags: [{ name: trimmedName, color }],
      });
    } else {
      const existingIndex = library.tags.findIndex(
        (t) => t.name === trimmedName
      );
      if (existingIndex >= 0) {
        library.tags[existingIndex].color = color;
      } else {
        library.tags.push({ name: trimmedName, color });
      }
      await library.save();
    }

    const updated = await UserTagLibrary.findOne({ userId: user.id }).lean();

    return NextResponse.json({
      tags: updated?.tags || [],
    });
  } catch (error) {
    console.error('Error saving tag:', error);
    return NextResponse.json(
      { error: 'Failed to save tag' },
      { status: 500 }
    );
  }
}

// DELETE /api/tags — Remove a saved tag from library
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    await UserTagLibrary.updateOne(
      { userId: user.id },
      { $pull: { tags: { name: name.toLowerCase() } } }
    );

    const updated = await UserTagLibrary.findOne({ userId: user.id }).lean();

    return NextResponse.json({
      tags: updated?.tags || [],
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
