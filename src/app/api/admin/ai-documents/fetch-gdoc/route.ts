import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';

function extractDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// POST /api/admin/ai-documents/fetch-gdoc
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

    const body = await request.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const docId = extractDocId(url);
    if (!docId) {
      return NextResponse.json(
        { error: 'Could not parse a Google Doc ID from that URL. Make sure it looks like https://docs.google.com/document/d/DOCID/...' },
        { status: 400 }
      );
    }

    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

    const res = await fetch(exportUrl, { redirect: 'follow' });

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json(
        {
          error:
            "Could not access this document. Make sure it's set to 'Anyone with the link can view' in Google Docs sharing settings.",
        },
        { status: 403 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            "Could not access this document. Make sure it's set to 'Anyone with the link can view' in Google Docs sharing settings.",
        },
        { status: 502 }
      );
    }

    const content = await res.text();

    // Attempt to get the title from the doc's HTML page
    let title: string | null = null;
    try {
      const htmlRes = await fetch(`https://docs.google.com/document/d/${docId}/`, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WiredCreatorStudio/1.0)',
        },
      });
      if (htmlRes.ok) {
        const html = await htmlRes.text();
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
          // Google Docs appends " - Google Docs" to the title
          title = titleMatch[1].replace(/\s*-\s*Google Docs\s*$/i, '').trim() || null;
        }
      }
    } catch {
      // Title is optional — swallow the error
    }

    return NextResponse.json({ title, content });
  } catch (err) {
    console.error('[fetch-gdoc] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
