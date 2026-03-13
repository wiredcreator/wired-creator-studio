"use client";

import { useState, useEffect, useCallback } from "react";
import PageWrapper from "@/components/PageWrapper";
import TaskCard, { TaskData } from "@/components/tasks/TaskCard";

// TODO: Replace with actual session user ID from auth
const PLACEHOLDER_USER_ID = "";

function getTodayISO(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState(PLACEHOLDER_USER_ID);

  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const today = getTodayISO();
      const res = await fetch(`/api/tasks?userId=${userId}&date=${today}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Could not load tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch session to get userId
  useEffect(() => {
    async function getSession() {
      try {
        const res = await fetch("/api/auth/session");
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

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t._id === taskId
          ? {
              ...t,
              status: newStatus,
              completedAt:
                newStatus === "completed"
                  ? new Date().toISOString()
                  : undefined,
            }
          : t
      )
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t._id === taskId ? updated : t)));
    } catch {
      // Revert on error
      fetchTasks();
    }
  };

  const handleAddComment = async (taskId: string, text: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, text }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t._id === taskId ? updated : t)));
    } catch {
      console.error("Error adding comment");
    }
  };

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalCount = tasks.length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <PageWrapper
      title={`${getGreeting()}`}
      subtitle={`${todayFormatted} — Focus on what matters right now.`}
    >
      <div className="space-y-5">
        {/* Progress indicator */}
        {totalCount > 0 && (
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-[var(--color-bg-secondary)]">
              <div
                className="h-1.5 rounded-full bg-[var(--color-accent)] transition-all duration-500"
                style={{
                  width: `${(completedCount / totalCount) * 100}%`,
                }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium text-[var(--color-text-muted)]">
              {completedCount}/{totalCount}
            </span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)]"
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-error)] bg-[var(--color-error-light)] p-5 text-center">
            <p className="text-sm text-[var(--color-error)]">{error}</p>
            <button
              onClick={fetchTasks}
              className="mt-2 text-sm font-medium text-[var(--color-accent)] hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* All done celebration */}
        {allDone && !loading && (
          <div className="animate-fadeIn rounded-[var(--radius-lg)] border border-[var(--color-success)] bg-[var(--color-success-light)] p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success)]">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
              Great work today
            </h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              You finished everything on your list. Rest up and come back
              tomorrow.
            </p>
          </div>
        )}

        {/* Task list */}
        {!loading && !error && tasks.length > 0 && (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                currentUserId={userId}
                onStatusChange={handleStatusChange}
                onAddComment={handleAddComment}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && tasks.length === 0 && (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-bg-secondary)]">
              <svg
                className="h-5 w-5 text-[var(--color-text-muted)]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              No tasks for today yet. Your coach will set things up for you.
            </p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
