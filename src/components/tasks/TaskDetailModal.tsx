"use client";

import { useEffect, useRef, useState } from "react";
import { TaskComment, TaskData } from "./TaskCard";

interface TaskDetailModalProps {
  task: TaskData;
  onClose: () => void;
  onMarkComplete: (taskId: string) => void;
  onTaskUpdated?: (updatedTask: TaskData) => void;
}

/**
 * Extracts a YouTube embed URL from various YouTube URL formats.
 * Returns null if the URL is not a YouTube link.
 */
function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  if (url.includes("youtube.com/embed/")) return url;
  return null;
}

function formatDateLabel(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function isOverdue(dateString: string, isCompleted: boolean): boolean {
  if (isCompleted) return false;
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return taskDate.getTime() < today.getTime();
}

/**
 * Renders description text with support for:
 * - YouTube video embeds (URLs on their own line become iframes)
 * - Image URLs rendered as images
 * - Line breaks preserved
 */
function RichDescription({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        const ytEmbed = getYouTubeEmbedUrl(trimmed);
        if (ytEmbed) {
          return (
            <div key={i} className="overflow-hidden rounded-[var(--radius-md)]">
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
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
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6",
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
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "1 day ago";
  if (diffDay < 30) return `${diffDay} days ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth === 1) return "1 month ago";
  return `${diffMonth} months ago`;
}

function getCommentUserName(userId: TaskComment["userId"]): string {
  if (typeof userId === "object" && userId !== null) return userId.name || "User";
  return "User";
}

const TIME_OPTIONS = [
  { label: "3 days", days: 3 },
  { label: "5 days", days: 5 },
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
];

export default function TaskDetailModal({
  task,
  onClose,
  onMarkComplete,
  onTaskUpdated,
}: TaskDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const timePopoverRef = useRef<HTMLDivElement>(null);
  const isCompleted = task.status === "completed";
  const overdue = isOverdue(task.dueDate, isCompleted);

  const [confirmingComplete, setConfirmingComplete] = useState(false);
  const [stuckLoading, setStuckLoading] = useState(false);
  const [stuckConfirmed, setStuckConfirmed] = useState(false);
  const [timePopoverOpen, setTimePopoverOpen] = useState(false);
  const [extensionLoading, setExtensionLoading] = useState(false);
  const [extensionConfirmed, setExtensionConfirmed] = useState(false);

  // Comments
  const [comments, setComments] = useState<TaskComment[]>(task.comments || []);
  const [commentText, setCommentText] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (timePopoverOpen) {
          setTimePopoverOpen(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, timePopoverOpen]);

  // Close time popover on outside click
  useEffect(() => {
    if (!timePopoverOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (timePopoverRef.current && !timePopoverRef.current.contains(e.target as Node)) {
        setTimePopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [timePopoverOpen]);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleStuck = async () => {
    setStuckLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stuck: true }),
      });
      if (res.ok) {
        const updated = await res.json();
        setStuckConfirmed(true);
        onTaskUpdated?.(updated);
        setTimeout(() => setStuckConfirmed(false), 3000);
      }
    } catch (err) {
      console.error("Failed to flag stuck:", err);
    } finally {
      setStuckLoading(false);
    }
  };

  const handleExtension = async (days: number) => {
    setExtensionLoading(true);
    setTimePopoverOpen(false);
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extensionDays: days }),
      });
      if (res.ok) {
        const updated = await res.json();
        setExtensionConfirmed(true);
        onTaskUpdated?.(updated);
        setTimeout(() => setExtensionConfirmed(false), 3000);
      }
    } catch (err) {
      console.error("Failed to request extension:", err);
    } finally {
      setExtensionLoading(false);
    }
  };

  // Sync comments when task prop changes
  useEffect(() => {
    setComments(task.comments || []);
  }, [task.comments]);

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const handleSendComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || commentSending) return;
    setCommentSending(true);
    try {
      const res = await fetch(`/api/tasks/${task._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (res.ok) {
        const updated = await res.json();
        setComments(updated.comments || []);
        setCommentText("");
        onTaskUpdated?.(updated);
      }
    } catch (err) {
      console.error("Failed to send comment:", err);
    } finally {
      setCommentSending(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn"
    >
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        {/* Close button — top right */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] outline-none ring-0"
          aria-label="Close"
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
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {/* Task title */}
          <h2 className="pr-10 text-xl font-semibold text-[var(--color-text-primary)]">
            {task.title}
          </h2>

          {/* Embedded video from task field */}
          {task.embeddedVideoUrl && (() => {
            const embedUrl = getYouTubeEmbedUrl(task.embeddedVideoUrl);
            const finalUrl = embedUrl || task.embeddedVideoUrl;
            return (
              <div className="overflow-hidden rounded-[var(--radius-md)]">
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
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

          {/* Tags row */}
          <div className="flex flex-wrap items-center gap-2">
            {isCompleted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success)] px-3 py-1 text-xs font-medium text-white">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
                Completed
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-medium text-[var(--color-bg-dark)]">
                To do
              </span>
            )}

            {task.dueDate && (
              <span className="inline-flex items-center rounded-full bg-[var(--color-bg-secondary)] px-3 py-1 text-xs font-medium text-[var(--color-text-primary)]">
                {formatDateLabel(task.dueDate)}
              </span>
            )}

            {overdue && (
              <span className="inline-flex items-center rounded-full bg-[var(--color-error)] px-3 py-1 text-xs font-medium text-white">
                Overdue
              </span>
            )}
          </div>

          {/* Confirmation messages */}
          {stuckConfirmed && (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)]">
              <svg className="h-4 w-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Your coach has been notified
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
          {task.description && <RichDescription text={task.description} />}

          {/* Empty state when no description or video */}
          {!task.description && !task.embeddedVideoUrl && (
            <p className="text-sm text-[var(--color-text-muted)]">
              No details have been added to this task yet.
            </p>
          )}

          {/* Comments section */}
          <div className="space-y-4 pt-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Comments
            </h3>

            {/* Comment list */}
            {comments.length > 0 && (
              <div className="space-y-3">
                {comments.map((comment) => {
                  const name = getCommentUserName(comment.userId);
                  const initial = name.charAt(0).toUpperCase();
                  const color = getAvatarColor(name);

                  return (
                    <div key={comment._id} className="flex gap-3">
                      {/* Avatar */}
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {initial}
                      </div>

                      {/* Comment body */}
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
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
                placeholder="Ask a question or leave a note for your coach..."
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

            {/* Privacy note */}
            <p className="text-xs text-[var(--color-text-muted)]">
              Comments are private — only you and your coach can see them.
            </p>
          </div>
        </div>

        {/* Footer with action buttons */}
        <div className="flex items-center border-t border-[var(--color-border-light)] px-6 py-4">
          {/* Left side: I'm Stuck + Request More Time */}
          {!isCompleted && (
            <div className="flex items-center gap-2">
              {/* I'm Stuck button */}
              <button
                onClick={handleStuck}
                disabled={stuckLoading || stuckConfirmed}
                title="Tell your coach you need help with this task"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50 outline-none ring-0"
              >
                {/* Flag icon */}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                </svg>
                {stuckLoading ? "Sending..." : "I'm Stuck"}
              </button>

              {/* Request More Time button + popover */}
              <div className="relative" ref={timePopoverRef}>
                <button
                  onClick={() => setTimePopoverOpen((prev) => !prev)}
                  disabled={extensionLoading || extensionConfirmed}
                  title="Request more time for this task"
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50 outline-none ring-0"
                >
                  {/* Clock icon */}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  {extensionLoading ? "Updating..." : "Request more time"}
                </button>

                {/* Time options popover */}
                {timePopoverOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-36 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg">
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
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side: Close + Mark as Complete */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] outline-none ring-0"
            >
              Close
            </button>

            {!isCompleted && !confirmingComplete && (
              <button
                onClick={() => setConfirmingComplete(true)}
                className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] outline-none ring-0"
              >
                Mark as Complete
              </button>
            )}
            {!isCompleted && confirmingComplete && (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-sm font-medium text-[var(--color-text-primary)]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Are you sure?
                </span>
                <button
                  onClick={() => {
                    setConfirmingComplete(false);
                    onMarkComplete(task._id);
                  }}
                  className="rounded-[var(--radius-md)] bg-[var(--color-success)] px-3 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 outline-none ring-0"
                >
                  Yes, complete
                </button>
                <button
                  onClick={() => setConfirmingComplete(false)}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] outline-none ring-0"
                >
                  Cancel
                </button>
              </div>
            )}
            {isCompleted && (
              <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-success)] px-4 py-2 text-sm font-medium text-white">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
                Completed
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
