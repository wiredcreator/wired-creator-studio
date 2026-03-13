import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Script from '@/models/Script';

// GET /api/scripts/[id] — Get full script
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id } = await params;

    const script = await Script.findById(id)
      .populate('ideaId', 'title status contentPillar')
      .lean();

    if (!script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(script);
  } catch (error) {
    console.error('Error fetching script:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/scripts/[id] — Update script content, status, or add feedback
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id } = await params;
    const body = await request.json();

    const script = await Script.findById(id);
    if (!script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    // Apply updates
    if (body.title !== undefined) script.title = body.title;
    if (body.fullScript !== undefined) script.fullScript = body.fullScript;
    if (body.bulletPoints !== undefined) script.bulletPoints = body.bulletPoints;
    if (body.teleprompterVersion !== undefined) script.teleprompterVersion = body.teleprompterVersion;
    if (body.status !== undefined) script.status = body.status;

    // Add feedback if provided
    if (body.feedback) {
      script.feedback.push({
        userId: body.feedback.userId,
        text: body.feedback.text,
        createdAt: new Date(),
      });
    }

    // Increment version on content changes
    if (body.fullScript !== undefined || body.bulletPoints !== undefined || body.teleprompterVersion !== undefined) {
      script.version = (script.version || 1) + 1;
    }

    await script.save();

    return NextResponse.json(script);
  } catch (error) {
    console.error('Error updating script:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/scripts/[id] — Remove script
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id } = await params;

    const script = await Script.findByIdAndDelete(id);
    if (!script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Script deleted successfully' });
  } catch (error) {
    console.error('Error deleting script:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
