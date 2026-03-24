"use client";

import { useState, useEffect, useCallback } from "react";
import PageWrapper from "@/components/PageWrapper";
import TaskCard, { TaskData } from "@/components/tasks/TaskCard";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"todo" | "completed">("todo");
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tasks");
      if (!res.ok) {
        setTasks([]);
        return;
      }
      const data = await res.json();
      setTasks(data.data || data);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
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

    // Also update the selected task if it's open
    if (selectedTask && selectedTask._id === taskId) {
      setSelectedTask((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              completedAt:
                newStatus === "completed"
                  ? new Date().toISOString()
                  : undefined,
            }
          : null
      );
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t._id === taskId ? updated : t)));
      if (selectedTask && selectedTask._id === taskId) {
        setSelectedTask(updated);
      }
    } catch {
      fetchTasks();
    }
  };

  const handleMarkCompleteFromModal = (taskId: string) => {
    handleStatusChange(taskId, "completed");
  };

  const todoTasks = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "skipped"
  );
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const activeTasks = activeTab === "todo" ? todoTasks : completedTasks;

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <PageWrapper
      title={getGreeting()}
      subtitle={`${todayFormatted} — Focus on what matters right now.`}
    >
      <div className="space-y-6">
        {/* Progress indicator */}
        {tasks.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-[var(--color-bg-secondary)]">
              <div
                className="h-1.5 rounded-full bg-[var(--color-accent)] transition-all duration-500"
                style={{
                  width: `${
                    tasks.length > 0
                      ? (completedTasks.length / tasks.length) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium text-[var(--color-text-muted)]">
              {completedTasks.length}/{tasks.length}
            </span>
          </div>
        )}

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, borderRadius: 12, backgroundColor: 'var(--color-bg-secondary)', padding: 4 }}>
          <button
            onClick={() => setActiveTab("todo")}
            style={{
              flex: 1,
              borderRadius: 10,
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              ...(activeTab === "todo"
                ? { backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)', boxShadow: 'var(--shadow-sm)' }
                : { backgroundColor: 'transparent', color: 'var(--color-text-muted)' }),
            }}
          >
            To Do
            {todoTasks.length > 0 && (
              <span style={{ marginLeft: 8, fontSize: 12 }}>({todoTasks.length})</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            style={{
              flex: 1,
              borderRadius: 10,
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              ...(activeTab === "completed"
                ? { backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)', boxShadow: 'var(--shadow-sm)' }
                : { backgroundColor: 'transparent', color: 'var(--color-text-muted)' }),
            }}
          >
            Completed
            {completedTasks.length > 0 && (
              <span className="ml-2 text-xs">({completedTasks.length})</span>
            )}
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)]"
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
        {!loading &&
          activeTab === "todo" &&
          todoTasks.length === 0 &&
          completedTasks.length > 0 && (
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

        {/* Task grid */}
        {!loading && !error && activeTasks.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onStatusChange={handleStatusChange}
                onClick={setSelectedTask}
              />
            ))}
          </div>
        )}

        {/* Empty state — no tasks at all */}
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
            <p className="text-sm text-[var(--color-text)]">
              No tasks yet. Your coach will set things up for you.
            </p>
          </div>
        )}

        {/* Empty state — completed tab with no completed tasks */}
        {!loading &&
          !error &&
          activeTab === "completed" &&
          completedTasks.length === 0 &&
          tasks.length > 0 && (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
              <p className="text-sm text-[var(--color-text)]">
                No completed tasks yet. Keep going!
              </p>
            </div>
          )}
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onMarkComplete={handleMarkCompleteFromModal}
          onTaskUpdated={(updated) => {
            setSelectedTask(updated);
            setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
          }}
        />
      )}
    </PageWrapper>
  );
}
