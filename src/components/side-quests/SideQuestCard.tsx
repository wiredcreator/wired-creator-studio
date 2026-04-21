'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SideQuestType } from '@/models/SideQuest';
import VoiceTextarea from '@/components/onboarding/VoiceTextarea';

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
  // Framework v2 fields
  whyThisMatters?: string;
  category?: 'brand_brain_fuel' | 'scroll_study' | 'hook_gym' | 'record_button_reps';
  energyTier?: 'spark' | 'flow' | 'hyperfocus';
  motivationDriver?: 'captivate' | 'create' | 'compete' | 'complete';
  rescueStatement?: string;
  bonusRound?: string;
  deliverable?: string;
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

const CATEGORY_LABELS: Record<string, string> = {
  brand_brain_fuel: 'Brand Brain Fuel',
  scroll_study: 'Scroll Study',
  hook_gym: 'Hook Gym',
  record_button_reps: 'Record Button Reps',
};

const CATEGORY_STYLES: Record<string, React.CSSProperties> = {
  brand_brain_fuel: { backgroundColor: 'rgba(218,65,20,0.12)', color: '#DA4114', borderColor: 'rgba(218,65,20,0.25)' },
  scroll_study: { backgroundColor: 'rgba(74,144,217,0.12)', color: '#4A90D9', borderColor: 'rgba(74,144,217,0.25)' },
  hook_gym: { backgroundColor: 'rgba(220,53,53,0.12)', color: '#DC3535', borderColor: 'rgba(220,53,53,0.25)' },
  record_button_reps: { backgroundColor: 'rgba(46,166,110,0.12)', color: '#2EA66E', borderColor: 'rgba(46,166,110,0.25)' },
};

const ENERGY_LABELS: Record<string, string> = {
  spark: 'Spark',
  flow: 'Flow',
  hyperfocus: 'Hyperfocus',
};

const ENERGY_ICONS: Record<string, string> = {
  spark: '⚡',
  flow: '🔥',
  hyperfocus: '💎',
};

// ---------------------------------------------------------------------------
// Step definition builder
// ---------------------------------------------------------------------------

interface QuestStep {
  id: string;
  label: string;
  type: 'info' | 'response' | 'bonus';
}

function buildSteps(quest: SideQuestCardData): QuestStep[] {
  const steps: QuestStep[] = [];

  // Step 1: Always the quest prompt
  steps.push({ id: 'prompt', label: 'Your Quest', type: 'info' });

  // Step 2: Why This Matters (if present)
  if (quest.whyThisMatters) {
    steps.push({ id: 'why', label: 'Why This Matters', type: 'info' });
  }

  // Step 3: Rescue Statement (if present)
  if (quest.rescueStatement) {
    steps.push({ id: 'rescue', label: 'Encouragement', type: 'info' });
  }

  // Step 4: Deliverable (if present)
  if (quest.deliverable) {
    steps.push({ id: 'deliverable', label: 'Deliverable', type: 'info' });
  }

  // Step N-1: Response (always)
  steps.push({ id: 'response', label: 'Your Response', type: 'response' });

  // Step N: Bonus Round (if present)
  if (quest.bonusRound) {
    steps.push({ id: 'bonus', label: 'Bonus Round', type: 'bonus' });
  }

  return steps;
}

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
// Step Progress Indicator
// ---------------------------------------------------------------------------

function StepProgress({
  steps,
  currentStep,
  visitedSteps,
  onStepClick,
}: {
  steps: QuestStep[];
  currentStep: number;
  visitedSteps: Set<number>;
  onStepClick: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 px-1">
      {steps.map((step, i) => {
        const isCompleted = visitedSteps.has(i) && i < currentStep;
        const isCurrent = i === currentStep;
        const isClickable = visitedSteps.has(i) || i <= currentStep;

        return (
          <div key={step.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => isClickable && onStepClick(i)}
              disabled={!isClickable}
              className="relative flex items-center justify-center transition-all duration-200"
              title={`${step.label}${isCompleted ? ' (completed)' : ''}`}
              style={{ cursor: isClickable ? 'pointer' : 'default' }}
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200"
                style={{
                  backgroundColor: isCompleted
                    ? 'var(--color-success)'
                    : isCurrent
                    ? 'var(--color-accent)'
                    : 'var(--color-bg-secondary)',
                  color: isCompleted || isCurrent
                    ? '#FFFFFF'
                    : 'var(--color-text-muted)',
                  border: isCompleted || isCurrent
                    ? 'none'
                    : '1px solid var(--color-border)',
                }}
              >
                {isCompleted ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
            </button>
            {i < steps.length - 1 && (
              <div
                className="h-0.5 w-4 rounded-full transition-colors duration-200"
                style={{
                  backgroundColor: isCompleted
                    ? 'var(--color-success)'
                    : 'var(--color-border)',
                }}
              />
            )}
          </div>
        );
      })}
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

  // Wizard step state
  const steps = buildSteps(quest);
  const [currentStep, setCurrentStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));

  const needsResponse = quest.type === 'research_task' || quest.type === 'content_exercise' || quest.type === 'voice_storm_prompt';

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
    onComplete(quest._id, response.trim() || undefined);
    // Parent will handle the state update
    setTimeout(() => setIsSubmitting(false), 500);
  };

  const goToStep = (index: number) => {
    setCurrentStep(index);
    setVisitedSteps((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const handleStartQuest = () => {
    setIsExpanded(true);
    setCurrentStep(0);
    setVisitedSteps(new Set([0]));
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
                <span className="inline-flex items-center gap-1 rounded-[var(--radius-full)] bg-[var(--color-warning-light)] px-2 py-0.5 text-xs font-medium text-[var(--color-warning)]">
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

            {/* Save to Brand Brain button */}
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

  // Render step content
  const renderStepContent = (step: QuestStep) => {
    switch (step.id) {
      case 'prompt':
        return (
          <div className="animate-fadeIn">
            <div className="rounded-[var(--radius-md)] bg-[var(--color-accent-subtle)] p-5">
              <p className="text-sm font-medium text-[var(--color-accent)] mb-2">Your Quest</p>
              <p className="text-sm leading-relaxed text-[var(--color-text-primary)]">
                {quest.prompt}
              </p>
            </div>
            {/* Timer shown on the prompt step */}
            {quest.estimatedMinutes != null && quest.estimatedMinutes > 0 && (
              <div className="mt-4">
                <CountdownTimer minutes={quest.estimatedMinutes} />
              </div>
            )}
          </div>
        );
      case 'why':
        return (
          <div className="animate-fadeIn">
            <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] p-5">
              <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Why This Matters</p>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {quest.whyThisMatters}
              </p>
            </div>
          </div>
        );
      case 'rescue':
        return (
          <div className="animate-fadeIn">
            <div
              className="rounded-[var(--radius-md)] p-5"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">A Little Encouragement</p>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] italic">
                {quest.rescueStatement}
              </p>
            </div>
          </div>
        );
      case 'deliverable':
        return (
          <div className="animate-fadeIn">
            <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] p-5">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-4 w-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Deliverable</p>
              </div>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {quest.deliverable}
              </p>
            </div>
          </div>
        );
      case 'response':
        return (
          <div className="animate-fadeIn">
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
              Your Response
            </label>
            <p className="mb-3 text-xs text-[var(--color-text-muted)]">
              Tap the mic to record a voice memo, or type your thoughts below. Take your time.
            </p>
            <VoiceTextarea
              id={`quest-response-${quest._id}`}
              value={response}
              onChange={setResponse}
              placeholder={quest.type === 'voice_storm_prompt'
                ? "Hit the mic button to record your voice memo, or type your thoughts here..."
                : "Record a voice memo or write your response here... Take your time, there's no rush."}
              rows={5}
            />
          </div>
        );
      case 'bonus':
        return (
          <div className="animate-fadeIn">
            <div
              className="rounded-[var(--radius-md)] p-5"
              style={{
                border: '1px dashed var(--color-border)',
                backgroundColor: 'var(--color-bg-card)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-4 w-4 text-[var(--color-warning)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                </svg>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">Bonus Round</p>
                <span className="text-xs text-[var(--color-text-muted)]">(optional)</span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {quest.bonusRound}
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isResponseStep = currentStepData?.id === 'response';
  const canComplete = isResponseStep || isLastStep;

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
        onClick={() => isExpanded ? setIsExpanded(false) : handleStartQuest()}
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

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {quest.category && CATEGORY_LABELS[quest.category] && (
                <span
                  className="inline-flex items-center rounded-[var(--radius-full)] border px-2.5 py-0.5 text-xs font-semibold"
                  style={CATEGORY_STYLES[quest.category]}
                >
                  {CATEGORY_LABELS[quest.category]}
                </span>
              )}

              <span className="inline-flex items-center rounded-[var(--radius-full)] border px-2.5 py-0.5 text-xs font-medium" style={TYPE_STYLES[quest.type]}>
                {TYPE_LABELS[quest.type]}
              </span>

              {quest.xpReward != null && (
                <span className="inline-flex items-center gap-1 rounded-[var(--radius-full)] bg-[var(--color-warning-light)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-warning)]">
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

              {quest.energyTier && (
                <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                  {ENERGY_ICONS[quest.energyTier] || ''} {ENERGY_LABELS[quest.energyTier] || quest.energyTier}
                </span>
              )}

              {!isExpanded && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--color-accent)]">
                  Start Quest
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* ================================================================ */}
      {/* Expanded: Step-by-step wizard flow                               */}
      {/* ================================================================ */}
      {isExpanded && (
        <div className="animate-fadeIn border-t border-[var(--color-border-light)]">
          {/* Step progress indicator */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border-light)] bg-[var(--color-bg-secondary)]">
            <StepProgress
              steps={steps}
              currentStep={currentStep}
              visitedSteps={visitedSteps}
              onStepClick={goToStep}
            />
            <span className="ml-3 shrink-0 text-xs font-medium text-[var(--color-text-muted)]">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>

          {/* Step label */}
          <div className="px-5 pt-4 pb-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {currentStepData.label}
            </p>
          </div>

          {/* Step content */}
          <div className="px-5 py-3" style={{ minHeight: 120 }}>
            {renderStepContent(currentStepData)}
          </div>

          {/* Navigation footer */}
          <div className="flex items-center justify-between border-t border-[var(--color-border-light)] px-5 py-3">
            {/* Left: Previous / Collapse */}
            <div className="flex items-center gap-2">
              {currentStep > 0 ? (
                <button
                  type="button"
                  onClick={goPrev}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)]"
                >
                  Collapse
                </button>
              )}
            </div>

            {/* Right: Next / Complete */}
            <div className="flex items-center gap-2">
              {/* Show Complete button on response step or last step */}
              {canComplete && (
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
              )}

              {/* Next button (only if not on last step) */}
              {!isLastStep && (
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
                >
                  Next
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
