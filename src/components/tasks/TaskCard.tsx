"use client";

import { useEffect, useRef, useState } from "react";

export interface TaskComment {
  _id: string;
  userId: { _id: string; name: string; email: string } | string;
  text: string;
  createdAt: string;
}

export interface TaskData {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  dueDate: string;
  completedAt?: string;
  assignedBy?: { _id: string; name: string; email: string };
  comments: TaskComment[];
  linkedContentId?: string;
  linkedContentType?: 'idea' | 'script';
  linkedContentTitle?: string;
  embeddedVideoUrl?: string;
  weekNumber: number;
  dayOfWeek: number;
  order: number;
  stuckAt?: string;
  stuckBy?: string;
  extensionRequested?: { days: number; requestedAt: string };
}

interface TaskCardProps {
  task: TaskData;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onClick: (task: TaskData) => void;
}

function formatDateLabel(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function isOverdue(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return taskDate.getTime() < today.getTime();
}

export default function TaskCard({ task, onStatusChange, onClick }: TaskCardProps) {
  const isCompleted = task.status === "completed";
  const overdue = !isCompleted && isOverdue(task.dueDate);
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);

  // Close confirmation on outside click
  useEffect(() => {
    if (!showConfirm) return;
    const handleClick = (e: MouseEvent) => {
      if (confirmRef.current && !confirmRef.current.contains(e.target as Node)) {
        setShowConfirm(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showConfirm]);

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCompleted) {
      // Uncompleting doesn't need confirmation
      onStatusChange(task._id, "pending");
    } else {
      setShowConfirm(true);
    }
  };

  const handleConfirmComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(false);
    onStatusChange(task._id, "completed");
  };

  const handleCancelConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(false);
  };

  const isFlagged = !!task.stuckAt;
  const commentCount = task.comments?.length || 0;

  return (
    <div
      onClick={() => onClick(task)}
      className="group flex cursor-pointer flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-6 transition-colors hover:border-[var(--color-border)]"
    >
      {/* Top row: tags left, checkbox right */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Flagged badge */}
          {isFlagged && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-2.5 py-0.5 text-xs font-medium text-white">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
              </svg>
              Flagged
            </span>
          )}

          {/* Status tag */}
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success)] px-2.5 py-0.5 text-xs font-medium text-white">
              Completed
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-[var(--color-accent)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-bg-dark)]">
              To do
            </span>
          )}

          {/* Date tag */}
          <span className="inline-flex items-center rounded-full bg-[var(--color-bg-secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-primary)]">
            {formatDateLabel(task.dueDate)}
          </span>

          {/* Overdue tag */}
          {overdue && (
            <span className="inline-flex items-center rounded-full bg-[var(--color-error)] px-2.5 py-0.5 text-xs font-medium text-white">
              Overdue
            </span>
          )}
        </div>

        {/* Circle checkbox with confirmation */}
        <div className="relative shrink-0">
          <button
            onClick={handleToggleComplete}
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-200 ${
              isCompleted
                ? "border-[var(--color-success)] bg-[var(--color-success)] text-white"
                : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
            }`}
            aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
          >
            {isCompleted && (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={3}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            )}
          </button>

          {/* Confirmation popover */}
          {showConfirm && (
            <div
              ref={confirmRef}
              className="absolute right-0 top-full z-10 mt-2 w-48 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-2 text-xs font-medium text-[var(--color-text-primary)]">
                Mark as complete?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmComplete}
                  className="flex-1 rounded-[var(--radius-sm)] bg-[var(--color-success)] px-2 py-1.5 text-xs font-medium text-white transition-colors hover:brightness-110 outline-none ring-0"
                >
                  Yes
                </button>
                <button
                  onClick={handleCancelConfirm}
                  className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] outline-none ring-0"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task title */}
      <h3
        className={`mt-4 text-base font-semibold leading-snug ${
          isCompleted
            ? "text-[var(--color-text-muted)] line-through"
            : "text-[var(--color-text-primary)]"
        }`}
      >
        {task.title}
      </h3>

      {/* Linked content badge */}
      {task.linkedContentType && task.linkedContentTitle && (
        <span
          className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${
            task.linkedContentType === 'idea' ? 'bg-purple-600' : 'bg-emerald-600'
          }`}
        >
          {task.linkedContentType === 'idea' ? '[Idea]' : '[Script]'} {task.linkedContentTitle}
        </span>
      )}

      {/* Bottom row: comment count left, view details right */}
      <div className="mt-4 flex items-center justify-between">
        <div>
          {commentCount > 0 && (
            <span className="text-xs text-[var(--color-text-muted)]">
              <svg className="mr-1 inline h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
              {commentCount} {commentCount === 1 ? "comment" : "comments"}
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-[var(--color-accent)]">
          View details &rarr;
        </span>
      </div>
    </div>
  );
}
