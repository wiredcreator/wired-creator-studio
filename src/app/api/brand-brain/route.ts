import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BrandBrain from '@/models/BrandBrain';
import { getAuthenticatedUser } from '@/lib/api-auth';

// GET /api/brand-brain — Fetch current user's Brand Brain
export async function GET() {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const brandBrain = await BrandBrain.findOne({ userId: user.id })
      .populate('toneOfVoiceGuide')
      .lean();

    if (!brandBrain) {
      return NextResponse.json(
        { error: 'Brand Brain not found for this user' },
        { status: 404 }
      );
    }

    return NextResponse.json(brandBrain);
  } catch (error) {
    console.error('Error fetching Brand Brain:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/brand-brain — Create initial Brand Brain for a user
export async function POST() {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    // Check if Brand Brain already exists for this user
    const existing = await BrandBrain.findOne({ userId: user.id });
    if (existing) {
      return NextResponse.json(
        { error: 'Brand Brain already exists for this user. Use PUT to update.' },
        { status: 409 }
      );
    }

    const brandBrain = await BrandBrain.create({
      userId: user.id,
      contentPillars: [],
      industryData: {},
      equipmentProfile: {},
    });

    return NextResponse.json(brandBrain, { status: 201 });
  } catch (error) {
    console.error('Error creating Brand Brain:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
