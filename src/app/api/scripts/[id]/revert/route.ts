import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Script from '@/models/Script';
import ContentIdea from '@/models/ContentIdea';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validateObjectId } from '@/lib/validation';

// POST /api/scripts/[id]/revert — Revert script back to idea stage
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    await dbConnect();

    const { id } = await params;
    const invalidId = validateObjectId(id);
    if (invalidId) return invalidId;

    const script = await Script.findById(id);
    if (!script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    const isOwner = script.userId.toString() === user.id;
    const isPrivileged = user.role === 'admin';

    if (!isOwner && !isPrivileged) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Restore the linked idea to 'approved' status
    if (script.ideaId) {
      await ContentIdea.findByIdAndUpdate(script.ideaId, {
        status: 'approved',
      });
    }

    // Soft-delete the script
    await (script as any).softDelete(user.id);

    return NextResponse.json({ message: 'Script reverted to idea stage' });
  } catch (error) {
    console.error('Error reverting script:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
