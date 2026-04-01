'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  xpReward?: number;
  estimatedMinutes?: number;
  response?: string;
  completed: boolean;
  completedAt?: string;
  savedToBrandBrain?: boolean;
  createdAt: string;
}

interface SideQuestCardProps {
  quest: SideQuestCardData;
  onComplete: (id: string, response?: string) => void;
  onSaveToBrain?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<SideQuestType, string> = {
  voice_storm_prompt: 'Voice Storm',
  research_task: 'Research',
  content_exercise: 'Exercise',
};

const TYPE_STYLES: Record<SideQuestType, React.CSSProperties> = {
  voice_storm_prompt: { backgroundColor: 'rgba(147,51,234,0.15)', color: '#A78BFA', borderColor: 'rgba(147,51,234,0.3)' },
  research_task: { backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)', borderColor: 'var(--color-warning)' },
  content_exercise: { backgroundColor: 'rgba(20,184,166,0.15)', color: '#2DD4BF', borderColor: 'rgba(20,184,166,0.3)' },
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
// Countdown Timer
// ---------------------------------------------------------------------------

type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

function CountdownTimer({ minutes }: { minutes: number }) {
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const startTimer = () => {
    if (status === 'idle') {
      setSecondsLeft(minutes * 60);
    }
    setStatus('running');
    clearTimer();
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setStatus('finished');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    clearTimer();
    setStatus('paused');
  };

  const resetTimer = () => {
    clearTimer();
    setSecondsLeft(minutes * 60);
    setStatus('idle');
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const progress = 1 - secondsLeft / (minutes * 60);

  if (status === 'idle') {
    return (
      <button
        type="button"
        onClick={startTimer}
        className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        Start Timer ({minutes} min)
      </button>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2 transition-all ${
        status === 'finished'
          ? 'animate-timer-nudge border-[var(--color-warning)] bg-[var(--color-bg-secondary)]'
          : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)]'
      }`}
    >
      {/* Circular progress indicator */}
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
        <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="2.5"
          />
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke={status === 'finished' ? 'var(--color-warning)' : 'var(--color-accent)'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 13}`}
            strokeDashoffset={`${2 * Math.PI * 13 * (1 - progress)}`}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
      </div>

      {/* Time display */}
      <span
        className={`font-mono text-base font-semibold tabular-nums ${
          status === 'finished'
            ? 'text-[var(--color-warning)]'
            : 'text-[var(--color-text-primary)]'
        }`}
      >
        {display}
      </span>

      {/* Finished message */}
      {status === 'finished' && (
        <span className="text-xs text-[var(--color-warning)]">
          Time is up! No rush, finish when you are ready.
        </span>
      )}

      {/* Controls */}
      <div className="flex items-center gap-1">
        {status === 'running' && (
          <button
            type="button"
            onClick={pauseTimer}
            className="rounded-[var(--radius-sm)] p-1 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
            title="Pause timer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
            </svg>
          </button>
        )}

        {status === 'paused' && (
          <button
            type="button"
            onClick={startTimer}
            className="rounded-[var(--radius-sm)] p-1 text-[var(--color-accent)] transition-colors hover:text-[var(--color-text-primary)]"
            title="Resume timer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
          </button>
        )}

        {(status === 'paused' || status === 'finished') && (
          <button
            type="button"
            onClick={resetTimer}
            className="rounded-[var(--radius-sm)] p-1 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
            title="Reset timer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SideQuestCard({ quest, onComplete, onSaveToBrain }: SideQuestCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [response, setResponse] = useState(quest.response || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(quest.savedToBrandBrain || false);

  const needsResponse = quest.type === 'research_task' || quest.type === 'content_exercise';

  const handleSaveToBrain = async () => {
    if (saved || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/side-quests/${quest._id}/save-to-brain`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaved(true);
      onSaveToBrain?.(quest._id);
    } catch (err) {
      console.error('Failed to save to Brand Brain:', err);
    } finally {
      setIsSaving(false);
    }
  };

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
              <span className="inline-flex items-center rounded-[var(--radius-full)] border px-2 py-0.5 text-xs font-medium" style={TYPE_STYLES[quest.type]}>
                {TYPE_LABELS[quest.type]}
              </span>
              {quest.xpReward != null && (
                <span className="inline-flex items-center gap-1 rounded-[var(--radius-full)] bg-[#3a3a2a] px-2 py-0.5 text-xs font-medium text-[#a0a060]">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  +{quest.xpReward} XP
                </span>
              )}
            </div>
            {quest.response && (
              <p className="mt-2 text-xs text-[var(--color-text-muted)] line-clamp-2">
                {quest.response}
              </p>
            )}

            {/* Save to Brand Brain button — only for quests with a response */}
            {quest.response && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleSaveToBrain}
                  disabled={saved || isSaving}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: saved ? 'var(--color-success-light)' : 'var(--color-bg-secondary)',
                    color: saved ? 'var(--color-success)' : 'var(--color-text-secondary)',
                    borderColor: saved ? 'var(--color-success)' : 'var(--color-border)',
                  }}
                >
                  {isSaving ? (
                    <>
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Saving...
                    </>
                  ) : saved ? (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      Saved to Brand Brain
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                      </svg>
                      Save to Brand Brain
                    </>
                  )}
                </button>
              </div>
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
              <span className="inline-flex items-center rounded-[var(--radius-full)] border px-2.5 py-0.5 text-xs font-medium" style={TYPE_STYLES[quest.type]}>
                {TYPE_LABELS[quest.type]}
              </span>

              {quest.xpReward != null && (
                <span className="inline-flex items-center gap-1 rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#EAB308', borderColor: 'rgba(234,179,8,0.3)' }}>
                  +{quest.xpReward} XP
                </span>
              )}

              {quest.estimatedMinutes != null && (
                <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  ~{quest.estimatedMinutes} min
                </span>
              )}

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

          {/* Optional countdown timer */}
          {quest.estimatedMinutes != null && quest.estimatedMinutes > 0 && (
            <div className="mt-4">
              <CountdownTimer minutes={quest.estimatedMinutes} />
            </div>
          )}

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
