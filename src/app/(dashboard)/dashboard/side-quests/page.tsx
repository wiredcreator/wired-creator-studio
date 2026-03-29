'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PageWrapper from '@/components/PageWrapper';
import SideQuestCard from '@/components/side-quests/SideQuestCard';
import type { SideQuestCardData } from '@/components/side-quests/SideQuestCard';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function SideQuestsPage() {
  const [userId, setUserId] = useState('');
  const [quests, setQuests] = useState<SideQuestCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

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

  // --- Fetch quests ---
  const fetchQuests = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/side-quests?userId=${userId}`);
      if (!res.ok) return;
      const raw = await res.json();
      const data: SideQuestCardData[] = raw.data || raw;
      setQuests(data);
    } catch (err) {
      console.error('Failed to fetch side quests:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  // --- Generate more quests ---
  const handleGenerateMore = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/side-quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId }),
      });

      if (!res.ok) throw new Error('Generation failed');

      const newQuests: SideQuestCardData[] = await res.json();
      setQuests((prev) => [...newQuests, ...prev]);
    } catch (err) {
      console.error('Failed to generate side quests:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Save to Brand Brain (optimistic) ---
  const handleSaveToBrain = (id: string) => {
    setQuests((prev) =>
      prev.map((q) => (q._id === id ? { ...q, savedToBrandBrain: true } : q))
    );
  };

  // --- Complete a quest (optimistic) ---
  const handleComplete = async (id: string, response?: string) => {
    // Save previous state for rollback
    const previousQuests = quests;

    // Optimistic update — mark as completed immediately
    setQuests((prev) =>
      prev.map((q) =>
        q._id === id
          ? {
              ...q,
              completed: true,
              completedAt: new Date().toISOString(),
              response: response || q.response,
            }
          : q
      )
    );

    try {
      const res = await fetch(`/api/side-quests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: true,
          response: response || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to complete quest');

      const updated = await res.json();
      // Reconcile with server response
      setQuests((prev) =>
        prev.map((q) => (q._id === id ? { ...q, ...updated } : q))
      );
    } catch (err) {
      console.error('Failed to complete quest:', err);
      // Revert on failure
      setQuests(previousQuests);
    }
  };

  // --- Split quests ---
  const activeQuests = useMemo(
    () => quests.filter((q) => !q.completed),
    [quests]
  );

  const completedQuests = useMemo(
    () => quests.filter((q) => q.completed),
    [quests]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <PageWrapper title="Side Quests" subtitle="Low-pressure creative exercises. No deadlines, no grades.">
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Side Quests" subtitle="Low-pressure creative exercises. No deadlines, no grades.">
      {/* Friendly intro */}
      <div className="mb-8 rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            <svg className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m6.115 5.19.319 1.913A6 6 0 0 0 8.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 0 0 2.288-4.042 1.087 1.087 0 0 0-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 0 1-.98-.314l-.295-.295a1.125 1.125 0 0 1 0-1.591l.13-.132a1.125 1.125 0 0 1 1.3-.21l.603.302a.809.809 0 0 0 1.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 0 0 1.528-1.732l.146-.292M6.115 5.19A9 9 0 1 0 17.18 4.64M6.115 5.19A8.965 8.965 0 0 1 12 3c1.929 0 3.716.607 5.18 1.64" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Side quests are optional challenges to flex your creative muscles.
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              No pressure, no grades, no due dates. These are designed to help you explore new ideas, practice your craft, and feed your Brand Brain with fresh material. Do them when you feel like it, skip them when you don&apos;t.
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* AVAILABLE QUESTS                                                 */}
      {/* ================================================================ */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Available Quests
          </h2>
          {activeQuests.length > 0 && (
            <span className="rounded-[var(--radius-full)] bg-[var(--color-accent-light)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-accent)]">
              {activeQuests.length} quest{activeQuests.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {activeQuests.length > 0 ? (
          <div className="space-y-3">
            {activeQuests.map((quest) => (
              <SideQuestCard
                key={quest._id}
                quest={quest}
                onComplete={handleComplete}
                onSaveToBrain={handleSaveToBrain}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-warning-light)]">
              <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m6.115 5.19.319 1.913A6 6 0 0 0 8.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 0 0 2.288-4.042 1.087 1.087 0 0 0-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 0 1-.98-.314l-.295-.295a1.125 1.125 0 0 1 0-1.591l.13-.132a1.125 1.125 0 0 1 1.3-.21l.603.302a.809.809 0 0 0 1.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 0 0 1.528-1.732l.146-.292M6.115 5.19A9 9 0 1 0 17.18 4.64M6.115 5.19A8.965 8.965 0 0 1 12 3c1.929 0 3.716.607 5.18 1.64" />
              </svg>
            </div>
            <p className="text-sm text-[var(--color-text)]">
              No quests available right now. Generate some below!
            </p>
          </div>
        )}

        {/* Generate more button */}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleGenerateMore}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 py-2.5 text-sm font-medium text-[var(--color-text)] shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)] hover:border-[var(--color-accent)] disabled:bg-[#555] disabled:text-[#999]"
          >
            {isGenerating ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                Generating quests...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                </svg>
                Generate More Quests
              </>
            )}
          </button>
        </div>
      </section>

      {/* ================================================================ */}
      {/* COMPLETED QUESTS                                                 */}
      {/* ================================================================ */}
      {completedQuests.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="mb-4 flex w-full items-center justify-between rounded-[var(--radius-md)] px-1 py-2 text-left transition-colors hover:bg-[var(--color-bg-secondary)]"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--color-text-secondary)]">
                Completed Quests
              </h2>
              <span className="rounded-[var(--radius-full)] bg-[var(--color-success-light)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-success)]">
                {completedQuests.length}
              </span>
            </div>
            <svg
              className={`h-5 w-5 text-[var(--color-text-muted)] transition-transform duration-200 ${
                showCompleted ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {showCompleted && (
            <div className="animate-fadeIn space-y-2">
              {completedQuests.map((quest) => (
                <SideQuestCard
                  key={quest._id}
                  quest={quest}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </PageWrapper>
  );
}
