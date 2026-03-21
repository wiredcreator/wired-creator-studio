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

export default function BrainDumpPage() {
  const [transcript, setTranscript] = useState('');
  const [callType, setCallType] = useState<CallType>('brain_dump');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
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
        // Session fetch failed — userId remains empty
      }
    }
    getSession();
  }, []);

  const fetchSessions = useCallback(async () => {
    if (!userId) {
      setIsLoadingSessions(false);
      return;
    }

    try {
      const res = await fetch(`/api/brain-dump?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.data || data.sessions || []);
      }
    } catch {
      // Silently fail — sessions list is non-critical
    } finally {
      setIsLoadingSessions(false);
    }
  }, [userId]);

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
          userId,
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

  // --- Delete session handler (optimistic) ---
  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      const previousSessions = sessions;
      // Optimistically remove from local list
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));

      fetch(`/api/brain-dump/${sessionId}`, { method: 'DELETE' })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to delete session');
        })
        .catch((err) => {
          console.error('Error deleting session:', err);
          // Revert to previous state
          setSessions(previousSessions);
          setError('Failed to delete session. Please try again.');
        });
    },
    [sessions]
  );

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
                className="w-full max-w-xs rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-0"
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
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text)] placeholder:opacity-50 focus:border-[var(--color-accent)] focus:outline-none focus:ring-0 resize-y"
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
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:bg-[#555] disabled:text-[#999] disabled:cursor-not-allowed"
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
              <p className="text-sm text-[var(--color-text)]">
                No brain dump sessions yet. Submit a transcript above to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session._id} className="relative group">
                  <SessionCard session={session} />
                  <button
                    onClick={() => handleDeleteSession(session._id)}
                    className="absolute top-3 right-12 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-bg-secondary)]"
                    title="Delete session"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
