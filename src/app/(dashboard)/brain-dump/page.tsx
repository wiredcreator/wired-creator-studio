'use client';

import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '@/components/PageWrapper';
import BrainDumpResults from '@/components/brain-dump/BrainDumpResults';
import SessionCard from '@/components/brain-dump/SessionCard';

type CallType = '1on1_coaching' | 'brain_dump' | 'support';

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

interface Session {
  _id: string;
  callType: string;
  transcript: string;
  extractedIdeas: { title: string; description: string }[];
  extractedStories: { summary: string; fullText: string }[];
  extractedThemes: string[];
  ingestedIntoBrandBrain: boolean;
  callDate: string;
  createdAt: string;
}

// TODO: Replace with actual auth — get userId from session
const PLACEHOLDER_USER_ID = '000000000000000000000000';

export default function BrainDumpPage() {
  const [transcript, setTranscript] = useState('');
  const [callType, setCallType] = useState<CallType>('brain_dump');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [error, setError] = useState('');

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/brain-dump?userId=${PLACEHOLDER_USER_ID}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {
      // Silently fail — sessions list is non-critical
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!transcript.trim()) {
      setError('Please paste a transcript before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setExtractedData(null);

    try {
      const res = await fetch('/api/brain-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript.trim(),
          userId: PLACEHOLDER_USER_ID,
          callType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to process brain dump');
      }

      const data = await res.json();
      setExtractedData(data.extracted);
      setTranscript('');
      // Refresh sessions list
      fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageWrapper
      title="Brain Dump"
      subtitle="Paste a coaching call transcript to extract content ideas, stories, and insights."
    >
      <div className="space-y-10">
        {/* Submit New Brain Dump */}
        <section>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
            Submit New Brain Dump
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Call Type Selector */}
            <div>
              <label
                htmlFor="callType"
                className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
              >
                Call Type
              </label>
              <select
                id="callType"
                value={callType}
                onChange={(e) => setCallType(e.target.value as CallType)}
                className="w-full max-w-xs rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              >
                <option value="brain_dump">Brain Dump Session</option>
                <option value="1on1_coaching">1-on-1 Coaching</option>
                <option value="support">Support Call</option>
              </select>
            </div>

            {/* Transcript Input */}
            <div>
              <label
                htmlFor="transcript"
                className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
              >
                Transcript
              </label>
              <textarea
                id="transcript"
                value={transcript}
                onChange={(e) => {
                  setTranscript(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Paste the full call transcript here..."
                rows={10}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] resize-y"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-[var(--color-error)]">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !transcript.trim()}
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                  </svg>
                  Processing...
                </>
              ) : (
                'Process Transcript'
              )}
            </button>
          </form>
        </section>

        {/* Extracted Results (shown after processing) */}
        {extractedData && (
          <section>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
              Extracted Results
            </h2>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-[var(--shadow-sm)]">
              <BrainDumpResults
                contentIdeas={extractedData.contentIdeas}
                stories={extractedData.stories}
                insights={extractedData.insights}
                themes={extractedData.themes}
              />
            </div>
          </section>
        )}

        {/* Previous Sessions */}
        <section>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
            Previous Sessions
          </h2>
          {isLoadingSessions ? (
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] py-8 justify-center">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] py-12 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                No brain dump sessions yet. Submit a transcript above to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <SessionCard key={session._id} session={session} />
              ))}
            </div>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
