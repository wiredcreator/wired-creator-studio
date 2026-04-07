import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';

// POST /api/admin/ai-documents/upload-file
// Accepts a file upload (PDF, TXT, DOCX, MD) and returns extracted text content.
export async function POST(req: Request) {
  const authResult = await getAuthenticatedUser();
  if (authResult instanceof NextResponse) return authResult;
  if (authResult.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let content = '';

    if (name.endsWith('.pdf')) {
      // Import the core lib directly to avoid pdf-parse's index.js which tries to load a test PDF
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buf: Buffer) => Promise<{ text: string }>;
      const parsed = await pdfParse(buffer);
      content = parsed.text;
    } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      content = result.value;
    } else if (name.endsWith('.txt') || name.endsWith('.text') || name.endsWith('.md')) {
      content = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF, TXT, DOCX, or MD file.' },
        { status: 400 }
      );
    }

    // Derive a title from filename (strip extension)
    const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');

    return NextResponse.json({ content: content.trim(), title });
  } catch (err) {
    console.error('[upload-file] Error processing file:', err);
    return NextResponse.json({ error: 'Failed to process file.' }, { status: 500 });
  }
}
