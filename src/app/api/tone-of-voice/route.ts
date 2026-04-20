import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ToneOfVoiceGuide from '@/models/ToneOfVoiceGuide';
import BrandBrain from '@/models/BrandBrain';
import { getAuthenticatedUser } from '@/lib/api-auth';

// GET /api/tone-of-voice — List all Tone of Voice guides
// Students see only their own guides
// Coaches/admins see all, or filter by ?userId=<id>
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');

    const isPrivileged = user.role === 'admin';

    // Build query filter
    let filter: Record<string, string> = {};

    if (isPrivileged) {
      // Coaches/admins can filter by userId or see all
      if (requestedUserId) {
        filter = { userId: requestedUserId };
      }
    } else {
      // Students can only see their own guides
      filter = { userId: user.id };
    }

    const guides = await ToneOfVoiceGuide.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(guides);
  } catch (error) {
    console.error('Error listing Tone of Voice Guides:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tone-of-voice — Create a new Tone of Voice guide manually
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const body = await request.json();
    const { parameters = [], summary = '', brandBrainId } = body;

    if (!brandBrainId) {
      return NextResponse.json(
        { error: 'brandBrainId is required' },
        { status: 400 }
      );
    }

    const brandBrain = await BrandBrain.findById(brandBrainId);
    if (!brandBrain) {
      return NextResponse.json(
        { error: 'Brand Brain not found' },
        { status: 404 }
      );
    }

    if (brandBrain.userId.toString() !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    const guide = await ToneOfVoiceGuide.create({
      userId: user.id,
      brandBrainId,
      parameters,
      summary,
      status: 'draft',
    });

    // Link the guide to the Brand Brain
    brandBrain.toneOfVoiceGuide = guide._id;
    await brandBrain.save();

    return NextResponse.json(guide, { status: 201 });
  } catch (error) {
    console.error('Error creating Tone of Voice Guide:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
