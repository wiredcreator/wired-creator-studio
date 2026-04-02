import { NextRequest, NextResponse } from 'next/server';
import { aiLimiter, getRateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { getAuthenticatedUser } from '@/lib/api-auth';
import OpenAI from 'openai';

// Allow large audio uploads (up to 25MB, Whisper's limit)
export const runtime = 'nodejs';
export const maxDuration = 60; // seconds - Whisper can take a while on longer chunks

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Whisper limit)

export async function POST(request: NextRequest) {
  try {
    const rl = aiLimiter.check(getRateLimitKey(request, 'voice-transcribe'));
    if (!rl.success) return rateLimitResponse(rl.resetIn);

    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Audio file too large (${Math.round(audioFile.size / 1024 / 1024)}MB). Maximum is 25MB. Try shorter recordings.` },
        { status: 413 }
      );
    }

    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: 'Audio file is empty. Please try recording again.' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'text',
    });

    return NextResponse.json({ text: transcription });
  } catch (error) {
    console.error('Transcription error:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to transcribe audio: ${message}` },
      { status: 500 }
    );
  }
}
