import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AIDocument, {
  AI_DOCUMENT_CATEGORIES,
  AI_DOCUMENT_SCOPES,
} from '@/models/AIDocument';
import { getAuthenticatedUser } from '@/lib/api-auth';

// GET /api/admin/ai-documents
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const scope = searchParams.get('scope');
    const userId = searchParams.get('userId');

    await dbConnect();

    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (scope) filter.scope = scope;
    if (userId) filter.userId = userId;

    const documents = await AIDocument.find(filter)
      .populate('userId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ category: 1, scope: 1, sortOrder: 1 })
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

// POST /api/admin/ai-documents
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

    const body = await request.json();
    const {
      title,
      category,
      scope,
      userId,
      content,
      sortOrder,
    } = body as {
      title?: string;
      category?: string;
      scope?: string;
      userId?: string;
      content?: string;
      sortOrder?: number;
    };

    if (!title?.trim() || !category || !scope || !content?.trim()) {
      return NextResponse.json(
        { error: 'title, category, scope, and content are required' },
        { status: 400 }
      );
    }

    if (!AI_DOCUMENT_CATEGORIES.includes(category as typeof AI_DOCUMENT_CATEGORIES[number])) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${AI_DOCUMENT_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!AI_DOCUMENT_SCOPES.includes(scope as typeof AI_DOCUMENT_SCOPES[number])) {
      return NextResponse.json(
        { error: `Invalid scope. Must be one of: ${AI_DOCUMENT_SCOPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (scope === 'global' && userId) {
      return NextResponse.json(
        { error: 'userId must not be set when scope is global' },
        { status: 400 }
      );
    }

    if (scope === 'user' && !userId) {
      return NextResponse.json(
        { error: 'userId is required when scope is user' },
        { status: 400 }
      );
    }

    await dbConnect();

    const doc = await AIDocument.create({
      title: title.trim(),
      category,
      scope,
      userId: userId || null,
      content: content.trim(),
      sortOrder: sortOrder ?? 0,
      createdBy: user.id,
    });

    const populated = await AIDocument.findById(doc._id)
      .populate('userId', 'name email')
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json({ document: populated }, { status: 201 });
  } catch (error) {
    console.error('Error creating AI document:', error);
    return NextResponse.json(
      { error: 'Failed to create AI document' },
      { status: 500 }
    );
  }
}
