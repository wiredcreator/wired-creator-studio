import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AIDocument, { AI_DOCUMENT_CATEGORIES } from '@/models/AIDocument';
import { getAuthenticatedUser } from '@/lib/api-auth';

// GET /api/ai-documents
export async function GET(_request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const documents = await AIDocument.find({
      scope: 'user',
      userId: user.id,
    })
      .sort({ category: 1, sortOrder: 1 })
      .lean();

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching AI documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI documents' },
      { status: 500 }
    );
  }
}

// POST /api/ai-documents
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    const body = await request.json();
    const { title, category, content } = body as {
      title?: string;
      category?: string;
      content?: string;
    };

    if (!title?.trim() || !category || !content?.trim()) {
      return NextResponse.json(
        { error: 'title, category, and content are required' },
        { status: 400 }
      );
    }

    if (!AI_DOCUMENT_CATEGORIES.includes(category as typeof AI_DOCUMENT_CATEGORIES[number])) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${AI_DOCUMENT_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    await dbConnect();

    const doc = await AIDocument.create({
      title: title.trim(),
      category,
      scope: 'user',
      userId: user.id,
      content: content.trim(),
      sortOrder: 0,
      createdBy: user.id,
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (error) {
    console.error('Error creating AI document:', error);
    return NextResponse.json(
      { error: 'Failed to create AI document' },
      { status: 500 }
    );
  }
}
