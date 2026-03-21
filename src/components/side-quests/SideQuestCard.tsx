'use client';

import { useState } from 'react';
import type { SideQuestType } from '@/models/SideQuest';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SideQuestCardData {
  _id: string;
  title: string;
  description: string;
  type: SideQuestType;
  prompt: string;
  response?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

interface SideQuestCardProps {
  quest: SideQuestCardData;
  onComplete: (id: string, response?: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<SideQuestType, string> = {
  voice_storm_prompt: 'Voice Storm',
  research_task: 'Research',
  content_exercise: 'Exercise',
};

const TYPE_COLORS: Record<SideQuestType, string> = {
  voice_storm_prompt: 'bg-purple-900 text-purple-300 border-purple-700',
  research_task: 'bg-[var(--color-warning-light)] text-[var(--color-warning)] border-[var(--color-warning)]',
  content_exercise: 'bg-teal-900 text-teal-300 border-teal-700',
};

const TYPE_ICONS: Record<SideQuestType, React.ReactNode> = {
  voice_storm_prompt: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
    </svg>
  ),
  research_task: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  ),
  content_exercise: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SideQuestCard({ quest, onComplete }: SideQuestCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [response, setResponse] = useState(quest.response || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const needsResponse = quest.type === 'research_task' || quest.type === 'content_exercise';

  const handleComplete = async () => {
    setIsSubmitting(true);
    onComplete(quest._id, needsResponse ? response : undefined);
    // Parent will handle the state update
    setTimeout(() => setIsSubmitting(false), 500);
  };

  // Completed state
  if (quest.completed) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-4 opacity-75">
        <div className="flex items-start gap-3">
          {/* Checkmark */}
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-success)] text-white">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-[var(--color-text-muted)] line-through">
                {quest.title}
              </h3>
              <span className={`inline-flex items-center rounded-[var(--radius-full)] border px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[quest.type]}`}>
                {TYPE_LABELS[quest.type]}
              </span>
            </div>
            {quest.response && (
              <p className="mt-2 text-xs text-[var(--color-text-muted)] line-clamp-2">
                {quest.response}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-[var(--radius-lg)] border bg-[var(--color-bg-card)] shadow-[var(--shadow-sm)] transition-all duration-200 ${
        isExpanded
          ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent-light)]'
          : 'border-[var(--color-border)] hover:shadow-[var(--shadow-md)]'
      }`}
    >
      {/* Card header */}
      <button
        type="button"
        className="w-full cursor-pointer p-5 text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          {/* Type icon */}
          <div className="mt-0.5 shrink-0 text-[var(--color-accent)]">
            {TYPE_ICONS[quest.type]}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold leading-snug text-[var(--color-text-primary)]">
                {quest.title}
              </h3>
            </div>

            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {quest.description}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-[var(--radius-full)] border px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[quest.type]}`}>
                {TYPE_LABELS[quest.type]}
              </span>

              {!isExpanded && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--color-accent)]">
                  Start
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="animate-fadeIn border-t border-[var(--color-border-light)] p-5">
          {/* Full prompt */}
          <div className="rounded-[var(--radius-md)] bg-[var(--color-accent-subtle)] p-4">
            <p className="text-sm font-medium text-[var(--color-accent)] mb-2">Your Quest</p>
            <p className="text-sm leading-relaxed text-[var(--color-text-primary)]">
              {quest.prompt}
            </p>
          </div>

          {/* Response area for research tasks and exercises */}
          {needsResponse && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                Your Response
              </label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Write your response here... Take your time, there's no rush."
                className="min-h-[120px] w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-sm leading-relaxed text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
              />
            </div>
          )}

          {/* Voice storm prompt: just a reminder to record */}
          {quest.type === 'voice_storm_prompt' && (
            <p className="mt-4 text-xs text-[var(--color-text-muted)]">
              Use the Voice Storming tool to record your response, or just hit complete when you are done.
            </p>
          )}

          {/* Complete button */}
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={handleComplete}
              disabled={isSubmitting || (needsResponse && !response.trim())}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-success)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Completing...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Mark Complete
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)]"
            >
              Collapse
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
