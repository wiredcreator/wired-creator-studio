'use client';

import { useState, useEffect, useCallback } from 'react';
import BrainDumpResults from '@/components/brain-dump/BrainDumpResults';

interface ExtractedData {
  contentIdeas: {
    title: string;
    description: string;
    contentPillar: string;
    angle: string;
  }[];
  stories: {
    summary: string;
    fullText: string;
  }[];
  insights: {
    content: string;
    tags: string[];
  }[];
  themes: {
    theme: string;
    contentPillar: string;
    occurrences: number;
  }[];
}

export default function BrainDumpPath() {
  const [transcript, setTranscript] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');

  // Fetch session to get userId
  useEffect(() => {
    async function getSession() {
      try {
        const res = await fetch('/api/auth/session');
        const session = await res.json();
        if (session?.user?.id) {
          setUserId(session.user.id);
        }
      } catch {
        // Session fetch failed
      }
    }
    getSession();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!transcript.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError('');
    setExtractedData(null);

    try {
      const res = await fetch('/api/brain-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript.trim(),
          userId,
          callType: 'brain_dump',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to process brain dump');
      }

      const data = await res.json();
      setExtractedData(data.extracted);
      setTranscript('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [transcript, isSubmitting, userId]);

  // Show results if we have them
  if (extractedData) {
    return (
      <div className="w-full max-w-2xl animate-fadeIn">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-medium text-[var(--color-text-primary)]">
            Here&apos;s what we found
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Ideas, stories, and insights extracted from your brain dump.
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-[var(--shadow-sm)]">
          <BrainDumpResults
            contentIdeas={extractedData.contentIdeas}
            stories={extractedData.stories}
            insights={extractedData.insights}
            themes={extractedData.themes}
          />
        </div>
        <div className="mt-6 text-center">
          <button
            onClick={() => setExtractedData(null)}
            className="text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            Do another brain dump
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl animate-fadeIn">
      <div className="mb-8 text-center">
        <h2 className="text-xl font-medium text-[var(--color-text-primary)]">
          Brain Dump
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Get everything out of your head. Type it all out and let AI sort through it.
        </p>
      </div>

      <div className="space-y-4">
        <textarea
          value={transcript}
          onChange={(e) => {
            setTranscript(e.target.value);
            if (error) setError('');
          }}
          placeholder="Start typing everything on your mind... ideas, thoughts, random notes, anything."
          rows={12}
          className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 py-4 text-sm leading-relaxed text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-0 resize-y"
        />

        {error && (
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !transcript.trim()}
          className="w-full rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 py-3 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:bg-[var(--color-bg-elevated)] disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
              Processing...
            </span>
          ) : (
            'Process Brain Dump'
          )}
        </button>
      </div>
    </div>
  );
}
