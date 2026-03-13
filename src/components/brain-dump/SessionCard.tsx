'use client';

import { useState } from 'react';
import BrainDumpResults from './BrainDumpResults';

interface SessionCardProps {
  session: {
    _id: string;
    callType: string;
    transcript: string;
    extractedIdeas: { title: string; description: string }[];
    extractedStories: { summary: string; fullText: string }[];
    extractedThemes: string[];
    ingestedIntoBrandBrain: boolean;
    callDate: string;
    createdAt: string;
  };
}

const callTypeLabels: Record<string, string> = {
  '1on1_coaching': '1-on-1 Coaching',
  brain_dump: 'Brain Dump Session',
  support: 'Support Call',
  other: 'Other',
};

export default function SessionCard({ session }: SessionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const date = new Date(session.callDate || session.createdAt);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const transcriptExcerpt =
    session.transcript.length > 150
      ? session.transcript.slice(0, 150) + '...'
      : session.transcript;

  const ideasCount = session.extractedIdeas?.length || 0;
  const storiesCount = session.extractedStories?.length || 0;

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden transition-shadow hover:shadow-[var(--shadow-md)]">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-4 flex items-start justify-between gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-[var(--color-accent)] bg-[var(--color-accent-light)] px-2 py-0.5 rounded-[var(--radius-full)]">
              {callTypeLabels[session.callType] || session.callType}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              {formattedDate}
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
            {transcriptExcerpt}
          </p>
          <div className="mt-2 flex items-center gap-3">
            {ideasCount > 0 && (
              <span className="text-xs text-[var(--color-text-muted)]">
                {ideasCount} idea{ideasCount !== 1 ? 's' : ''}
              </span>
            )}
            {storiesCount > 0 && (
              <span className="text-xs text-[var(--color-text-muted)]">
                {storiesCount} stor{storiesCount !== 1 ? 'ies' : 'y'}
              </span>
            )}
            {session.ingestedIntoBrandBrain && (
              <span className="text-xs text-[var(--color-success)]">
                Ingested
              </span>
            )}
          </div>
        </div>
        <svg
          className={`h-5 w-5 shrink-0 text-[var(--color-text-muted)] transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-[var(--color-border)] p-4">
          <BrainDumpResults
            contentIdeas={session.extractedIdeas.map((idea) => ({
              title: idea.title,
              description: idea.description,
              contentPillar: '',
              angle: '',
            }))}
            stories={session.extractedStories}
            insights={[]}
            themes={session.extractedThemes.map((theme) => ({
              theme,
              contentPillar: 'uncategorized',
              occurrences: 1,
            }))}
          />
        </div>
      )}
    </div>
  );
}
