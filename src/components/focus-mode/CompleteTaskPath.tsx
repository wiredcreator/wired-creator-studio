'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface TaskComment {
  _id: string;
  userId: { _id: string; name: string; email: string } | string;
  text: string;
  createdAt: string;
}

interface Task {
  _id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  dueDate: string;
  weekNumber: number;
  embeddedVideoUrl?: string;
  comments: TaskComment[];
}

/* ── Helpers ── */

function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  if (url.includes('youtube.com/embed/')) return url;
  return null;
}

function RichDescription({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        const ytEmbed = getYouTubeEmbedUrl(trimmed);
        if (ytEmbed) {
          return (
            <div key={i} className="overflow-hidden rounded-[var(--radius-md)]">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={ytEmbed}
                  className="absolute inset-0 h-full w-full rounded-[var(--radius-md)]"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Embedded video"
                />
              </div>
            </div>
          );
        }

        if (/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(trimmed)) {
          return (
            <img
              key={i}
              src={trimmed}
              alt=""
              className="max-w-full rounded-[var(--radius-md)]"
            />
          );
        }

        if (!trimmed) {
          return <div key={i} className="h-2" />;
        }

        return (
          <p
            key={i}
            className="text-sm leading-relaxed text-[var(--color-text-secondary)]"
          >
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function relativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return '1 day ago';
  if (diffDay < 30) return `${diffDay} days ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth === 1) return '1 month ago';
  return `${diffMonth} months ago`;
}

function getCommentUserName(userId: TaskComment['userId']): string {
  if (typeof userId === 'object' && userId !== null) return userId.name || 'User';
  return 'User';
}

function formatDueDate(dateString: string): string {
  const date = new Date(dateString);
  const month = date.toLocaleString('en-US', { month: 'long' });
  const day = date.getDate();
  const suffix =
    day === 1 || day === 21 || day === 31 ? 'st' :
    day === 2 || day === 22 ? 'nd' :
    day === 3 || day === 23 ? 'rd' : 'th';
  return `${month} ${day}${suffix}`;
}

const TIME_OPTIONS = [
  { label: '3 days', days: 3 },
  { label: '5 days', days: 5 },
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
];

/* ── Task List View ── */

function TaskListView({
  pendingTasks,
  completedTasks,
  onTaskClick,
  onComplete,
  updating,
}: {
  pendingTasks: Task[];
  completedTasks: Task[];
  onTaskClick: (task: Task) => void;
  onComplete: (task: Task) => void;
  updating: string | null;
}) {
  const [showCompleted, setShowCompleted] = useState(false);

  return (
    <div className="w-full max-w-3xl animate-fadeIn">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-secondary)] mb-2">
          Focus Mode &middot; Tasks
        </p>
        <h2 className="text-2xl font-semibold text-[var(--color-text)]">
          {pendingTasks.length} task{pendingTasks.length !== 1 ? 's' : ''} remaining
        </h2>
      </div>

      {/* Pending tasks list */}
      <div className="space-y-3">
        {pendingTasks.map((task) => (
          <div
            key={task._id}
            className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-6 py-5 transition-shadow hover:shadow-[var(--shadow-md)] cursor-pointer"
            onClick={() => onTaskClick(task)}
          >
            {/* Task info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex rounded-full bg-[var(--color-accent)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--color-accent)]">
                  To do
                </span>
                {task.dueDate && (
                  <span className="inline-flex rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
                    {formatDueDate(task.dueDate)}
                  </span>
                )}
              </div>
              <p className="text-[15px] font-medium text-[var(--color-text)]">
                {task.title}
              </p>
              {task.comments && task.comments.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                  </svg>
                  {task.comments.length} comment{task.comments.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Completion circle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete(task);
              }}
              disabled={updating === task._id}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-border)] text-transparent transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50 outline-none ring-0"
              title="Mark as complete"
            >
              {updating === task._id ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* No pending tasks */}
      {pendingTasks.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-success-light)]">
            <svg className="h-7 w-7 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-[var(--color-text)]">All caught up!</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            No pending tasks right now.
          </p>
        </div>
      )}

      {/* Completed tasks collapsible */}
      {completedTasks.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowCompleted((prev) => !prev)}
            className="flex items-center gap-2 text-sm text-[var(--color-text)] transition-colors hover:text-[var(--color-text)] outline-none ring-0"
          >
            <svg
              className={`h-3.5 w-3.5 transition-transform ${showCompleted ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            {completedTasks.length} completed
          </button>

          {showCompleted && (
            <div className="mt-3 space-y-3 animate-fadeIn">
              {completedTasks.map((task) => (
                <div
                  key={task._id}
                  className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-6 py-5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="inline-flex rounded-full bg-[var(--color-success)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--color-success)]">
                        Done
                      </span>
                      {task.dueDate && (
                        <span className="inline-flex rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
                          {formatDueDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                    <p className="text-[15px] font-medium text-[var(--color-text)] line-through">
                      {task.title}
                    </p>
                  </div>
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-success)] text-white">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Task Detail View ── */

function TaskDetailView({
  task,
  tasks,
  onBack,
  onNext,
  onComplete,
  updating,
  onTaskUpdate,
}: {
  task: Task;
  tasks: Task[];
  onBack: () => void;
  onNext: (() => void) | null;
  onComplete: () => void;
  updating: boolean;
  onTaskUpdate: (updated: Task) => void;
}) {
  const [stuckConfirmed, setStuckConfirmed] = useState(false);
  const [extensionConfirmed, setExtensionConfirmed] = useState(false);
  const [timePopoverOpen, setTimePopoverOpen] = useState(false);
  const timePopoverRef = useRef<HTMLDivElement>(null);
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(
    (task.comments && task.comments.length > 0) || false
  );
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Find position in list
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const taskIndex = pendingTasks.findIndex((t) => t._id === task._id);

  // Close time popover on outside click
  useEffect(() => {
    if (!timePopoverOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (timePopoverRef.current && !timePopoverRef.current.contains(e.target as Node)) {
        setTimePopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [timePopoverOpen]);

  const handleStuck = useCallback(async () => {
    try {
      await fetch(`/api/tasks/${task._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stuck: true }),
      });
      setStuckConfirmed(true);
    } catch {
      // silently fail
    }
  }, [task._id]);

  const handleExtension = useCallback(async (days: number) => {
    setTimePopoverOpen(false);
    setExtensionConfirmed(true);
    setTimeout(() => setExtensionConfirmed(false), 3000);
    try {
      await fetch(`/api/tasks/${task._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionDays: days }),
      });
    } catch {
      setExtensionConfirmed(false);
    }
  }, [task._id]);

  const handleSendComment = useCallback(async () => {
    const trimmed = commentText.trim();
    if (!trimmed || commentSending) return;
    setCommentSending(true);
    try {
      const res = await fetch(`/api/tasks/${task._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      if (res.ok) {
        const updated = await res.json();
        onTaskUpdate({ ...task, comments: updated.comments || [] });
        setCommentText('');
        setTimeout(() => {
          commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch {
      // Failed silently
    } finally {
      setCommentSending(false);
    }
  }, [task, commentText, commentSending, onTaskUpdate]);

  const comments = task.comments || [];

  return (
    <div className="w-full max-w-2xl animate-fadeIn">
      {/* Back + Next + progress */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)] outline-none ring-0"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back to tasks
          </button>
          {onNext && (
            <button
              onClick={onNext}
              className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)] outline-none ring-0"
            >
              Next task
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}
        </div>
        {taskIndex >= 0 && (
          <p className="text-xs font-medium text-[var(--color-text-muted)]">
            Task {taskIndex + 1} of {pendingTasks.length}
          </p>
        )}
      </div>

      {/* Task Card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-md)] overflow-hidden">
        {/* Scrollable content area */}
        <div className="max-h-[60vh] overflow-y-auto p-8 space-y-5">
          {/* Type badge */}
          <div>
            <span className="inline-flex rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-primary)]">
              {task.type.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Embedded video */}
          {task.embeddedVideoUrl && (() => {
            const embedUrl = getYouTubeEmbedUrl(task.embeddedVideoUrl);
            const finalUrl = embedUrl || task.embeddedVideoUrl;
            return (
              <div className="overflow-hidden rounded-[var(--radius-md)]">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    src={finalUrl}
                    className="absolute inset-0 h-full w-full rounded-[var(--radius-md)]"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={task.title}
                  />
                </div>
              </div>
            );
          })()}

          {/* Title */}
          <h3 className="text-lg font-medium leading-snug text-[var(--color-text-primary)]">
            {task.title}
          </h3>

          {extensionConfirmed && (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)]">
              <svg className="h-4 w-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Due date updated
            </div>
          )}

          {/* Rich description */}
          {task.description && <RichDescription text={task.description} />}

          {/* Empty state when no description or video */}
          {!task.description && !task.embeddedVideoUrl && (
            <p className="text-sm text-[var(--color-text-muted)]">
              No details have been added to this task yet.
            </p>
          )}

          {/* Comments section */}
          <div className="space-y-3 pt-1">
            {comments.length > 0 ? (
              <>
                <button
                  onClick={() => setCommentsOpen((prev) => !prev)}
                  className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)] outline-none ring-0"
                >
                  <svg
                    className={`h-3 w-3 transition-transform ${commentsOpen ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                  Comments ({comments.length})
                </button>

                {commentsOpen && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="space-y-3">
                      {comments.map((comment, idx) => {
                        const name = getCommentUserName(comment.userId);
                        const initial = name.charAt(0).toUpperCase();
                        const color = getAvatarColor(name);

                        return (
                          <div key={comment._id || idx} className="flex gap-3">
                            <div
                              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                              style={{ backgroundColor: color }}
                            >
                              {initial}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline gap-2">
                                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                                  {name}
                                </span>
                                <span className="text-xs text-[var(--color-text-muted)]">
                                  {relativeTime(comment.createdAt)}
                                </span>
                              </div>
                              <div className="mt-1 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] px-3 py-2">
                                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                                  {comment.text}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={commentsEndRef} />
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {/* Reply input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
                placeholder="Ask a question or leave a note..."
                className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none ring-0"
              />
              <button
                onClick={handleSendComment}
                disabled={!commentText.trim() || commentSending}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40 outline-none ring-0"
                aria-label="Send comment"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Footer with action buttons */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] px-8 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleStuck}
              disabled={stuckConfirmed}
              title="Tell your team you need help with this task"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50 outline-none ring-0"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
              </svg>
              I&apos;m Stuck
            </button>

            <div className="relative" ref={timePopoverRef}>
              <button
                onClick={() => setTimePopoverOpen((prev) => !prev)}
                disabled={extensionConfirmed}
                title="Request more time for this task"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50 outline-none ring-0"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                More time
              </button>

              {timePopoverOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-36 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg z-10">
                  {TIME_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      onClick={() => handleExtension(opt.days)}
                      className="w-full px-4 py-2 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] outline-none ring-0"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-muted)] outline-none ring-0"
            >
              Back to List
            </button>
            <button
              onClick={onComplete}
              disabled={updating}
              className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed outline-none ring-0"
            >
              {updating ? 'Saving...' : 'Mark as Complete'}
            </button>
          </div>
        </div>

        {/* Coach notified confirmation */}
        {stuckConfirmed && (
          <div className="flex items-center justify-center gap-2 border-t border-[var(--color-border)] px-8 py-3 animate-fadeIn">
            <svg className="h-4 w-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">Your coach has been notified</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ── */

export default function CompleteTaskPath() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    async function fetchTasks() {
      try {
        // Fetch both pending and completed tasks
        const [pendingRes, completedRes] = await Promise.all([
          fetch('/api/tasks?status=pending&limit=50'),
          fetch('/api/tasks?status=completed&limit=50'),
        ]);
        const allTasks: Task[] = [];
        if (pendingRes.ok) {
          const data = await pendingRes.json();
          allTasks.push(...(data.data || []));
        }
        if (completedRes.ok) {
          const data = await completedRes.json();
          allTasks.push(...(data.data || []));
        }
        setTasks(allTasks);
      } catch {
        // Failed to load tasks
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  const handleComplete = useCallback(async (task: Task) => {
    if (updatingId) return;
    setUpdatingId(task._id);
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t._id === task._id ? { ...t, status: 'completed' } : t))
        );
        // If we were viewing this task's detail, go back to list
        if (selectedTask?._id === task._id) {
          setSelectedTask(null);
        }
      }
    } catch {
      // Failed silently
    } finally {
      setUpdatingId(null);
    }
  }, [updatingId, selectedTask]);

  const handleTaskUpdate = useCallback((updated: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === updated._id ? updated : t))
    );
    setSelectedTask(updated);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 animate-fadeIn">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        <p className="text-sm text-[var(--color-text-secondary)]">Loading tasks...</p>
      </div>
    );
  }

  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  // Detail view for a selected task
  if (selectedTask) {
    // Get the latest version from state
    const latestTask = tasks.find((t) => t._id === selectedTask._id) || selectedTask;
    const currentPending = tasks.filter((t) => t.status !== 'completed');
    const currentIndex = currentPending.findIndex((t) => t._id === latestTask._id);
    const nextTask = currentIndex >= 0 && currentIndex < currentPending.length - 1
      ? currentPending[currentIndex + 1]
      : null;
    return (
      <TaskDetailView
        task={latestTask}
        tasks={tasks}
        onBack={() => setSelectedTask(null)}
        onNext={nextTask ? () => setSelectedTask(nextTask) : null}
        onComplete={() => handleComplete(latestTask)}
        updating={updatingId === latestTask._id}
        onTaskUpdate={handleTaskUpdate}
      />
    );
  }

  // List view (default)
  return (
    <TaskListView
      pendingTasks={pendingTasks}
      completedTasks={completedTasks}
      onTaskClick={setSelectedTask}
      onComplete={handleComplete}
      updating={updatingId}
    />
  );
}
