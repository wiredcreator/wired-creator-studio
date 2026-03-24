"use client";

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

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = isCompleted ? "pending" : "completed";
    onStatusChange(task._id, newStatus);
  };

  return (
    <div
      onClick={() => onClick(task)}
      className="flex cursor-pointer flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-5 transition-colors hover:border-[var(--color-border)]"
    >
      {/* Top row: tags left, checkbox right */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
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

        {/* Circle checkbox */}
        <button
          onClick={handleToggleComplete}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
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
    </div>
  );
}
