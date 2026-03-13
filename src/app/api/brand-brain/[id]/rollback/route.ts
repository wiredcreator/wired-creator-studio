import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BrandBrain from '@/models/BrandBrain';
import { getAuthenticatedUser } from '@/lib/api-auth';

// POST /api/brand-brain/[id]/rollback — Rollback to a previous version
export async function POST(
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
    const { targetVersion } = body;

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
        { error: 'Not authorized to rollback this Brand Brain' },
        { status: 403 }
      );
    }

    if (brandBrain.previousVersions.length === 0) {
      return NextResponse.json(
        { error: 'No previous versions available for rollback' },
        { status: 400 }
      );
    }

    // Find the target version snapshot
    let snapshot;
    if (targetVersion !== undefined) {
      snapshot = brandBrain.previousVersions.find(
        (v) => v.version === targetVersion
      );
      if (!snapshot) {
        return NextResponse.json(
          {
            error: `Version ${targetVersion} not found. Available versions: ${brandBrain.previousVersions.map((v) => v.version).join(', ')}`,
          },
          { status: 404 }
        );
      }
    } else {
      // Default: rollback to the most recent previous version
      snapshot =
        brandBrain.previousVersions[brandBrain.previousVersions.length - 1];
    }

    // Save current state as a snapshot before rolling back
    const currentSnapshot = {
      version: brandBrain.version,
      snapshotDate: new Date(),
      toneOfVoiceGuide: brandBrain.toneOfVoiceGuide,
      contentPillars: brandBrain.contentPillars,
      industryData: brandBrain.industryData,
      equipmentProfile: brandBrain.equipmentProfile,
    };
    brandBrain.previousVersions.push(currentSnapshot);

    // Restore from snapshot
    brandBrain.toneOfVoiceGuide = snapshot.toneOfVoiceGuide;
    brandBrain.contentPillars = snapshot.contentPillars;
    brandBrain.industryData = snapshot.industryData;
    brandBrain.equipmentProfile = snapshot.equipmentProfile;

    // Save triggers version increment via pre-save hook
    await brandBrain.save();

    return NextResponse.json({
      message: `Rolled back to version ${snapshot.version}. New version: ${brandBrain.version}`,
      brandBrain,
    });
  } catch (error) {
    console.error('Error rolling back Brand Brain:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
