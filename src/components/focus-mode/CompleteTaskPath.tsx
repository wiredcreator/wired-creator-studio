'use client';

import { useState, useEffect, useCallback } from 'react';

interface Task {
  _id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  dueDate: string;
  weekNumber: number;
}

export default function CompleteTaskPath() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch('/api/tasks?status=pending&limit=50');
        if (res.ok) {
          const data = await res.json();
          setTasks(data.data || []);
        }
      } catch {
        // Failed to load tasks
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  const currentTask = tasks[currentIndex] || null;

  const handleComplete = useCallback(async () => {
    if (!currentTask || updating) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/tasks/${currentTask._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (res.ok) {
        setCompletedCount((c) => c + 1);
        setCurrentIndex((i) => i + 1);
      }
    } catch {
      // Failed silently
    } finally {
      setUpdating(false);
    }
  }, [currentTask, updating]);

  const handleSkip = useCallback(() => {
    setCurrentIndex((i) => i + 1);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 animate-fadeIn">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        <p className="text-sm text-[var(--color-text-muted)]">Loading tasks...</p>
      </div>
    );
  }

  // All tasks done or no tasks
  if (!currentTask) {
    return (
      <div className="w-full max-w-md text-center animate-fadeIn">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success-light)]">
          <svg className="h-8 w-8 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-xl font-medium text-[var(--color-text-primary)]">
          {completedCount > 0 ? 'All caught up!' : 'No pending tasks'}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {completedCount > 0
            ? `You completed ${completedCount} task${completedCount !== 1 ? 's' : ''} this session. Nice work.`
            : 'There are no tasks waiting for you right now.'}
        </p>
      </div>
    );
  }

  const remaining = tasks.length - currentIndex;

  return (
    <div className="w-full max-w-lg animate-fadeIn">
      {/* Progress indicator */}
      <div className="mb-8 text-center">
        <p className="text-xs text-[var(--color-text-muted)]">
          Task {currentIndex + 1} of {tasks.length}
          {completedCount > 0 && (
            <span className="ml-2 text-[var(--color-success)]">
              {completedCount} completed
            </span>
          )}
        </p>
      </div>

      {/* Task Card */}
      <div
        key={currentTask._id}
        className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 shadow-[var(--shadow-md)] animate-fadeIn"
      >
        {/* Type badge */}
        <div className="mb-4">
          <span className="inline-flex rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-primary)]">
            {currentTask.type.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-medium leading-snug text-[var(--color-text-primary)]">
          {currentTask.title}
        </h3>

        {/* Description */}
        {currentTask.description && (
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {currentTask.description}
          </p>
        )}

        {/* Actions */}
        <div className="mt-8 flex gap-3">
          <button
            onClick={handleComplete}
            disabled={updating}
            className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 py-3 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? 'Saving...' : 'Mark as Complete'}
          </button>
          <button
            onClick={handleSkip}
            disabled={updating}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-5 py-3 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-muted)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip for Now
          </button>
        </div>
      </div>

      {/* Remaining count */}
      {remaining > 1 && (
        <p className="mt-4 text-center text-xs text-[var(--color-text-muted)]">
          {remaining - 1} more task{remaining - 1 !== 1 ? 's' : ''} after this
        </p>
      )}
    </div>
  );
}
