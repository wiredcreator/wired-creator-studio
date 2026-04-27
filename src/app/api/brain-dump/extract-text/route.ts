import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = '';

    if (file.type === 'application/pdf') {
      // Import the core lib directly to avoid pdf-parse's index.js which tries to load a test PDF
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buf: Buffer) => Promise<{ text: string }>;
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword'
    ) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (file.type === 'text/plain') {
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a .txt, .pdf, or .doc/.docx file.' },
        { status: 400 },
      );
    }

    return NextResponse.json({ text: text.trim() });
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return NextResponse.json(
      { error: 'Failed to extract text from file' },
      { status: 500 },
    );
  }
}
