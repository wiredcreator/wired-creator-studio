"use client";

import { useState } from "react";

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
  embeddedVideoUrl?: string;
  weekNumber: number;
  dayOfWeek: number;
  order: number;
}

interface TaskCardProps {
  task: TaskData;
  currentUserId: string;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onAddComment: (taskId: string, text: string) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  watch_module: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z" />
    </svg>
  ),
  voice_storm: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
    </svg>
  ),
  submit_content: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  ),
  film_video: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  ),
  side_quest: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m6.115 5.19.319 1.913A6 6 0 0 0 8.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 0 0 2.288-4.042 1.087 1.087 0 0 0-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 0 1-.98-.314l-.295-.295a1.125 1.125 0 0 1 0-1.591l.13-.132a1.125 1.125 0 0 1 1.3-.21l.603.302a.809.809 0 0 0 1.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 0 0 1.528-1.732l.146-.292M6.115 5.19A9 9 0 1 0 17.18 4.64M6.115 5.19A8.965 8.965 0 0 1 12 3c1.929 0 3.716.607 5.18 1.64" />
    </svg>
  ),
  review_script: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  ),
  custom: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
    </svg>
  ),
};

const typeLabels: Record<string, string> = {
  watch_module: "Watch Module",
  voice_storm: "Voice Storm",
  submit_content: "Submit Content",
  film_video: "Film Video",
  side_quest: "Side Quest",
  review_script: "Review Script",
  custom: "Task",
};

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < -1440) {
    const days = Math.abs(Math.floor(diffMins / 1440));
    return `${days}d overdue`;
  }
  if (diffMins < 0) return "Due today";
  if (diffMins < 60) return `${diffMins}m left`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h left`;
  return `${Math.floor(diffMins / 1440)}d left`;
}

function formatCommentDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TaskCard({
  task,
  currentUserId,
  onStatusChange,
  onAddComment,
}: TaskCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

  const isCompleted = task.status === "completed";
  const isSkipped = task.status === "skipped";

  const handleToggleComplete = () => {
    if (isCompleting) return;
    setIsCompleting(true);
    const newStatus = isCompleted ? "pending" : "completed";
    onStatusChange(task._id, newStatus);
    // Reset animation state after transition
    setTimeout(() => setIsCompleting(false), 600);
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    onAddComment(task._id, commentText.trim());
    setCommentText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  return (
    <div
      className={`rounded-[var(--radius-lg)] border bg-[var(--color-bg-card)] shadow-[var(--shadow-sm)] transition-all duration-300 ${
        isCompleted
          ? "border-[var(--color-success)] bg-[var(--color-success-light)]"
          : isSkipped
          ? "border-[var(--color-border-light)] opacity-60"
          : "border-[var(--color-border)]"
      }`}
    >
      <div className="flex items-start gap-4 p-5">
        {/* Completion checkbox */}
        <button
          onClick={handleToggleComplete}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
            isCompleted
              ? "border-[var(--color-success)] bg-[var(--color-success)] text-white"
              : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
          }`}
          aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
        >
          {isCompleted && (
            <svg
              className="h-3.5 w-3.5 animate-fadeIn"
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

        {/* Task type icon */}
        <div
          className={`mt-0.5 shrink-0 ${
            isCompleted
              ? "text-[var(--color-success)]"
              : "text-[var(--color-accent)]"
          }`}
        >
          {typeIcons[task.type] || typeIcons.custom}
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3
                className={`text-sm font-medium transition-all duration-300 ${
                  isCompleted
                    ? "text-[var(--color-text-muted)] line-through"
                    : "text-[var(--color-text-primary)]"
                }`}
              >
                {task.title}
              </h3>
              <span className="mt-0.5 inline-block text-xs text-[var(--color-text-muted)]">
                {typeLabels[task.type] || "Task"}
              </span>
            </div>

            {/* Due indicator */}
            {!isCompleted && !isSkipped && (
              <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                {formatTime(task.dueDate)}
              </span>
            )}
            {isCompleted && (
              <span className="shrink-0 text-xs text-[var(--color-success)]">
                Done
              </span>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p
              className={`mt-2 text-sm leading-relaxed ${
                isCompleted
                  ? "text-[var(--color-text-muted)]"
                  : "text-[var(--color-text-secondary)]"
              }`}
            >
              {task.description}
            </p>
          )}

          {/* Embedded video */}
          {task.embeddedVideoUrl && !isCompleted && (
            <div className="mt-3 overflow-hidden rounded-[var(--radius-md)]">
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={task.embeddedVideoUrl}
                  className="absolute inset-0 h-full w-full rounded-[var(--radius-md)]"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={task.title}
                />
              </div>
            </div>
          )}

          {/* Comments toggle */}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)]"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                />
              </svg>
              {task.comments.length > 0
                ? `${task.comments.length} comment${task.comments.length !== 1 ? "s" : ""}`
                : "Add comment"}
            </button>
          </div>

          {/* Comments section */}
          {showComments && (
            <div className="mt-3 space-y-3 animate-fadeIn">
              {/* Existing comments */}
              {task.comments.map((comment) => {
                const userName =
                  typeof comment.userId === "object"
                    ? comment.userId.name
                    : "User";
                return (
                  <div
                    key={comment._id}
                    className="rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[var(--color-text-primary)]">
                        {userName}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {formatCommentDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      {comment.text}
                    </p>
                  </div>
                );
              })}

              {/* Add comment input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write a comment..."
                  className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim()}
                  className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
