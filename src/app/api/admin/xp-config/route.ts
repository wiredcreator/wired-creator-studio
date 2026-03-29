import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import XPConfig from '@/models/XPConfig';
import { XP_DEFAULTS } from '@/models/XPConfig';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { invalidateXPConfigCache } from '@/lib/xp-config';

// GET /api/admin/xp-config — Return current XP configuration
export async function GET() {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await dbConnect();

    let config = await XPConfig.findOne().lean();
    if (!config) {
      config = await XPConfig.create({ ...XP_DEFAULTS });
    }

    return NextResponse.json({
      taskCompleted: config.taskCompleted,
      newIdeaSaved: config.newIdeaSaved,
      newScriptCreated: config.newScriptCreated,
      newBrainDump: config.newBrainDump,
      sideQuestMin: config.sideQuestMin,
      sideQuestMax: config.sideQuestMax,
      voiceStorm: config.voiceStorm,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching XP config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/xp-config — Update XP configuration
export async function PUT(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();

    // Validate all fields are positive integers
    const fields = ['taskCompleted', 'newIdeaSaved', 'newScriptCreated', 'newBrainDump', 'sideQuestMin', 'sideQuestMax', 'voiceStorm'] as const;
    const update: Record<string, number> = {};

    for (const field of fields) {
      if (body[field] !== undefined) {
        const val = Number(body[field]);
        if (!Number.isInteger(val) || val < 0) {
          return NextResponse.json(
            { error: `${field} must be a non-negative integer` },
            { status: 400 }
          );
        }
        update[field] = val;
      }
    }

    // Validate sideQuestMin <= sideQuestMax
    const newMin = update.sideQuestMin;
    const newMax = update.sideQuestMax;
    if (newMin !== undefined && newMax !== undefined && newMin > newMax) {
      return NextResponse.json(
        { error: 'sideQuestMin cannot be greater than sideQuestMax' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Upsert: update existing or create new
    const config = await XPConfig.findOneAndUpdate(
      {},
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Invalidate the in-memory cache so new values take effect immediately
    invalidateXPConfigCache();

    return NextResponse.json({
      taskCompleted: config.taskCompleted,
      newIdeaSaved: config.newIdeaSaved,
      newScriptCreated: config.newScriptCreated,
      newBrainDump: config.newBrainDump,
      sideQuestMin: config.sideQuestMin,
      sideQuestMax: config.sideQuestMax,
      voiceStorm: config.voiceStorm,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    console.error('Error updating XP config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
