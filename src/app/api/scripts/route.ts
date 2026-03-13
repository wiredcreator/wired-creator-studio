import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Script from '@/models/Script';
import ContentIdea from '@/models/ContentIdea';
import { generateScript } from '@/lib/ai/generate';

// GET /api/scripts — List scripts with optional status filter
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    const status = request.nextUrl.searchParams.get('status');

    const filter: Record<string, unknown> = { userId };
    if (status) filter.status = status;

    const scripts = await Script.find(filter)
      .populate('ideaId', 'title status contentPillar')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(scripts);
  } catch (error) {
    console.error('Error fetching scripts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/scripts — Generate a new script from an approved idea
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { userId, ideaId, voiceStormTranscriptId } = body;

    if (!userId || !ideaId) {
      return NextResponse.json(
        { error: 'userId and ideaId are required' },
        { status: 400 }
      );
    }

    // Verify the idea exists
    const idea = await ContentIdea.findById(ideaId);
    if (!idea) {
      return NextResponse.json(
        { error: 'Content idea not found' },
        { status: 404 }
      );
    }

    // Generate the script (mock for now)
    const generated = await generateScript(
      ideaId,
      '', // voice storm transcript — will be wired up later
      ''  // brand brain context — will be wired up later
    );

    // Save to DB
    const script = await Script.create({
      userId,
      ideaId,
      title: generated.title || idea.title,
      fullScript: generated.fullScript,
      bulletPoints: generated.bulletPoints,
      teleprompterVersion: generated.teleprompterVersion,
      voiceStormTranscriptId: voiceStormTranscriptId || undefined,
      status: 'draft',
      version: 1,
    });

    return NextResponse.json(script, { status: 201 });
  } catch (error) {
    console.error('Error generating script:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
