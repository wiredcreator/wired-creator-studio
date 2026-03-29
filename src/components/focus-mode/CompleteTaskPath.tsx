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

const TIME_OPTIONS = [
  { label: '3 days', days: 3 },
  { label: '5 days', days: 5 },
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
];

/* ── Component ── */

export default function CompleteTaskPath() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  // Action feedback states
  const [stuckConfirmed, setStuckConfirmed] = useState(false);
  const [extensionConfirmed, setExtensionConfirmed] = useState(false);
  const [timePopoverOpen, setTimePopoverOpen] = useState(false);
  const timePopoverRef = useRef<HTMLDivElement>(null);

  // Comments
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

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

  // Reset per-task state when moving between tasks
  useEffect(() => {
    setStuckConfirmed(false);
    setExtensionConfirmed(false);
    setTimePopoverOpen(false);
    setCommentText('');
    setCommentsOpen(false);
  }, [currentIndex]);

  // Auto-open comments section if the task has existing comments
  useEffect(() => {
    if (currentTask && currentTask.comments && currentTask.comments.length > 0) {
      setCommentsOpen(true);
    }
  }, [currentTask]);

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

  const handleStuck = useCallback(async () => {
    if (!currentTask) return;
    setStuckConfirmed(true);
    setTimeout(() => setStuckConfirmed(false), 3000);

    try {
      await fetch(`/api/tasks/${currentTask._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stuck: true }),
      });
    } catch {
      setStuckConfirmed(false);
    }
  }, [currentTask]);

  const handleExtension = useCallback(async (days: number) => {
    if (!currentTask) return;
    setTimePopoverOpen(false);
    setExtensionConfirmed(true);
    setTimeout(() => setExtensionConfirmed(false), 3000);

    try {
      await fetch(`/api/tasks/${currentTask._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionDays: days }),
      });
    } catch {
      setExtensionConfirmed(false);
    }
  }, [currentTask]);

  const handleSendComment = useCallback(async () => {
    if (!currentTask) return;
    const trimmed = commentText.trim();
    if (!trimmed || commentSending) return;
    setCommentSending(true);
    try {
      const res = await fetch(`/api/tasks/${currentTask._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      if (res.ok) {
        const updated = await res.json();
        // Update the task in our local list
        setTasks((prev) =>
          prev.map((t) =>
            t._id === currentTask._id ? { ...t, comments: updated.comments || [] } : t
          )
        );
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
  }, [currentTask, commentText, commentSending]);

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
  const comments = currentTask.comments || [];

  return (
    <div className="w-full max-w-2xl animate-fadeIn">
      {/* Progress indicator */}
      <div className="mb-6 text-center">
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
        className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-md)] animate-fadeIn overflow-hidden"
      >
        {/* Scrollable content area */}
        <div className="max-h-[60vh] overflow-y-auto p-8 space-y-5">
          {/* Type badge */}
          <div>
            <span className="inline-flex rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-primary)]">
              {currentTask.type.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Embedded video */}
          {currentTask.embeddedVideoUrl && (() => {
            const embedUrl = getYouTubeEmbedUrl(currentTask.embeddedVideoUrl);
            const finalUrl = embedUrl || currentTask.embeddedVideoUrl;
            return (
              <div className="overflow-hidden rounded-[var(--radius-md)]">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    src={finalUrl}
                    className="absolute inset-0 h-full w-full rounded-[var(--radius-md)]"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={currentTask.title}
                  />
                </div>
              </div>
            );
          })()}

          {/* Title */}
          <h3 className="text-lg font-medium leading-snug text-[var(--color-text-primary)]">
            {currentTask.title}
          </h3>

          {/* Confirmation messages */}
          {stuckConfirmed && (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)]">
              <svg className="h-4 w-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Your team has been notified
            </div>
          )}

          {extensionConfirmed && (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)]">
              <svg className="h-4 w-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Due date updated
            </div>
          )}

          {/* Rich description */}
          {currentTask.description && <RichDescription text={currentTask.description} />}

          {/* Empty state when no description or video */}
          {!currentTask.description && !currentTask.embeddedVideoUrl && (
            <p className="text-sm text-[var(--color-text-muted)]">
              No details have been added to this task yet.
            </p>
          )}

          {/* Comments section */}
          <div className="space-y-3 pt-1">
            {/* Toggle header */}
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
              Comments{comments.length > 0 ? ` (${comments.length})` : ''}
            </button>

            {commentsOpen && (
              <div className="space-y-3 animate-fadeIn">
                {/* Comment list */}
                {comments.length > 0 && (
                  <div className="space-y-3">
                    {comments.map((comment) => {
                      const name = getCommentUserName(comment.userId);
                      const initial = name.charAt(0).toUpperCase();
                      const color = getAvatarColor(name);

                      return (
                        <div key={comment._id} className="flex gap-3">
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
                )}

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
                    className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none ring-0"
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
            )}
          </div>
        </div>

        {/* Footer with action buttons */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] px-8 py-4">
          {/* Left: I'm Stuck + Request More Time */}
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

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right: Skip + Complete */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSkip}
              disabled={updating}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-muted)] disabled:opacity-50 disabled:cursor-not-allowed outline-none ring-0"
            >
              Skip for Now
            </button>
            <button
              onClick={handleComplete}
              disabled={updating}
              className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed outline-none ring-0"
            >
              {updating ? 'Saving...' : 'Mark as Complete'}
            </button>
          </div>
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
