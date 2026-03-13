import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BrandBrain from '@/models/BrandBrain';
import { getAuthenticatedUser } from '@/lib/api-auth';

// PUT /api/brand-brain/[id] — Update Brand Brain with version snapshot
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { id } = await params;
    const body = await request.json();

    const brandBrain = await BrandBrain.findById(id);
    if (!brandBrain) {
      return NextResponse.json(
        { error: 'Brand Brain not found' },
        { status: 404 }
      );
    }

    // Ensure the user owns this Brand Brain (or is a coach/admin)
    if (brandBrain.userId.toString() !== user.id && user.role === 'student') {
      return NextResponse.json(
        { error: 'Not authorized to update this Brand Brain' },
        { status: 403 }
      );
    }

    // Create a snapshot of the current state before updating
    const snapshot = {
      version: brandBrain.version,
      snapshotDate: new Date(),
      toneOfVoiceGuide: brandBrain.toneOfVoiceGuide,
      contentPillars: brandBrain.contentPillars,
      industryData: brandBrain.industryData,
      equipmentProfile: brandBrain.equipmentProfile,
    };

    brandBrain.previousVersions.push(snapshot);

    // Apply updates from the request body
    if (body.contentPillars !== undefined) {
      brandBrain.contentPillars = body.contentPillars;
    }
    if (body.industryData !== undefined) {
      brandBrain.industryData = body.industryData;
    }
    if (body.equipmentProfile !== undefined) {
      brandBrain.equipmentProfile = body.equipmentProfile;
    }
    if (body.toneOfVoiceGuide !== undefined) {
      brandBrain.toneOfVoiceGuide = body.toneOfVoiceGuide;
    }

    // Save triggers the pre-save hook which increments the version
    await brandBrain.save();

    return NextResponse.json(brandBrain);
  } catch (error) {
    console.error('Error updating Brand Brain:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
