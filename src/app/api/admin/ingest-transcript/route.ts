import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CallTranscript from '@/models/CallTranscript';
import BrandBrain from '@/models/BrandBrain';
import { getAuthenticatedUser } from '@/lib/api-auth';

// POST /api/admin/ingest-transcript — Admin manually pastes a call transcript for a student
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

    await dbConnect();

    const body = await request.json();
    const { studentId, transcript, callType, title } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId is required' },
        { status: 400 }
      );
    }

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'transcript is required and must be non-empty text' },
        { status: 400 }
      );
    }

    // Map the simplified call types to the schema enum values
    const callTypeMap: Record<string, string> = {
      '1on1': '1on1_coaching',
      'group': 'support',
    };
    const resolvedCallType = callTypeMap[callType] || '1on1_coaching';

    // Create the CallTranscript record
    const callTranscript = await CallTranscript.create({
      userId: studentId,
      source: 'manual',
      callType: resolvedCallType,
      transcript: transcript.trim(),
      callDate: new Date(),
      extractedIdeas: [],
      extractedStories: [],
      extractedThemes: [],
      ingestedIntoBrandBrain: true,
      tags: title ? [title] : [],
    });

    // Link to Brand Brain
    try {
      await BrandBrain.findOneAndUpdate(
        { userId: studentId },
        { $addToSet: { callTranscripts: callTranscript._id } }
      );
    } catch (bbError) {
      console.error('[IngestTranscript] Brand Brain link failed (non-fatal):', bbError);
    }

    return NextResponse.json(
      {
        success: true,
        callTranscriptId: callTranscript._id,
        message: 'Transcript ingested and linked to Brand Brain',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error ingesting transcript:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
