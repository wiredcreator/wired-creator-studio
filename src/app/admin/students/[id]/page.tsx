"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import PageWrapper from "@/components/PageWrapper";
import TaskCard, { TaskData } from "@/components/tasks/TaskCard";
import ToneOfVoiceEditor from "@/components/brand-brain/ToneOfVoiceEditor";
import type { ToneOfVoiceParameter } from "@/types/ai";

interface StudentInfo {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}

type TovStatus = "draft" | "review" | "active";

interface ToneOfVoiceGuideData {
  _id: string;
  parameters: ToneOfVoiceParameter[];
  status: TovStatus;
  version: number;
}

interface BrandBrainData {
  _id: string;
  toneOfVoiceGuide?: ToneOfVoiceGuideData | null;
}

const TASK_TYPES = [
  { value: "watch_module", label: "Watch Module" },
  { value: "voice_storm", label: "Voice Storm" },
  { value: "submit_content", label: "Submit Content" },
  { value: "film_video", label: "Film Video" },
  { value: "side_quest", label: "Side Quest" },
  { value: "review_script", label: "Review Script" },
  { value: "custom", label: "Custom" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function StudentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [coachId, setCoachId] = useState("");

  // New task form state
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    type: "custom",
    dueDate: "",
    weekNumber: 1,
    dayOfWeek: 1,
    embeddedVideoUrl: "",
    order: 0,
  });

  // Tone of Voice review state
  const [tovGuide, setTovGuide] = useState<ToneOfVoiceGuideData | null>(null);
  const [showTovEditor, setShowTovEditor] = useState(false);
  const [tovUpdating, setTovUpdating] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    type: "custom",
    dueDate: "",
    weekNumber: 1,
    dayOfWeek: 1,
    embeddedVideoUrl: "",
  });

  // Fetch coach session
  useEffect(() => {
    async function getSession() {
      try {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        if (session?.user?.id) {
          setCoachId(session.user.id);
        }
      } catch {
        // Session fetch failed
      }
    }
    getSession();
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/tasks?userId=${id}&weekNumber=${selectedWeek}`
      );
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  }, [id, selectedWeek]);

  // Fetch student info and tasks
  useEffect(() => {
    async function fetchStudent() {
      try {
        setLoading(true);
        // Try to fetch student info (use signup endpoint as user query)
        const res = await fetch(`/api/users?userId=${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data) setStudent(data);
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    }

    fetchStudent();
  }, [id]);

  // Fetch Brand Brain (includes populated toneOfVoiceGuide)
  useEffect(() => {
    async function fetchBrandBrain() {
      try {
        const res = await fetch(`/api/brand-brain?userId=${id}`);
        if (res.ok) {
          const data: BrandBrainData = await res.json();
          if (data.toneOfVoiceGuide) {
            setTovGuide(data.toneOfVoiceGuide);
          }
        }
      } catch {
        // Brand Brain may not exist yet
      }
    }
    fetchBrandBrain();
  }, [id]);

  // Tone of Voice review actions
  const handleTovStatusChange = async (newStatus: TovStatus) => {
    if (!tovGuide) return;
    setTovUpdating(true);
    try {
      const res = await fetch(`/api/tone-of-voice/${tovGuide._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTovGuide(updated);
      }
    } catch {
      console.error("Error updating Tone of Voice status");
    } finally {
      setTovUpdating(false);
    }
  };

  const handleTovSave = async (
    params: ToneOfVoiceParameter[],
    _summary: string
  ) => {
    if (!tovGuide) return;
    setTovUpdating(true);
    try {
      const res = await fetch(`/api/tone-of-voice/${tovGuide._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parameters: params }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTovGuide(updated);
      }
    } catch {
      console.error("Error saving Tone of Voice parameters");
    } finally {
      setTovUpdating(false);
    }
  };

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
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t._id === taskId ? updated : t)));
    } catch {
      fetchTasks();
    }
  };

  const handleAddComment = async (taskId: string, text: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: coachId, text }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t._id === taskId ? updated : t)));
      }
    } catch {
      console.error("Error adding comment");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.dueDate) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: id,
          title: newTask.title,
          description: newTask.description,
          type: newTask.type,
          dueDate: newTask.dueDate,
          assignedBy: coachId,
          weekNumber: newTask.weekNumber,
          dayOfWeek: newTask.dayOfWeek,
          embeddedVideoUrl: newTask.embeddedVideoUrl,
          order: newTask.order,
        }),
      });

      if (res.ok) {
        setNewTask({
          title: "",
          description: "",
          type: "custom",
          dueDate: "",
          weekNumber: selectedWeek,
          dayOfWeek: 1,
          embeddedVideoUrl: "",
          order: 0,
        });
        setShowAddForm(false);
        fetchTasks();
      }
    } catch (err) {
      console.error("Error creating task:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t._id !== taskId));
      }
    } catch {
      console.error("Error deleting task");
    }
  };

  const handleStartEdit = (task: TaskData) => {
    setEditingTask(task._id);
    setEditForm({
      title: task.title,
      description: task.description || "",
      type: task.type,
      dueDate: task.dueDate.split("T")[0],
      weekNumber: task.weekNumber,
      dayOfWeek: task.dayOfWeek,
      embeddedVideoUrl: task.embeddedVideoUrl || "",
    });
  };

  const handleSaveEdit = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          type: editForm.type,
          dueDate: editForm.dueDate,
          weekNumber: editForm.weekNumber,
          dayOfWeek: editForm.dayOfWeek,
          embeddedVideoUrl: editForm.embeddedVideoUrl,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t._id === taskId ? updated : t)));
        setEditingTask(null);
      }
    } catch {
      console.error("Error updating task");
    }
  };

  // Group tasks by day
  const tasksByDay: Record<number, TaskData[]> = {};
  for (const task of tasks) {
    const day = task.dayOfWeek;
    if (!tasksByDay[day]) tasksByDay[day] = [];
    tasksByDay[day].push(task);
  }

  // Progress stats
  const completedThisWeek = tasks.filter(
    (t) => t.status === "completed"
  ).length;
  const totalThisWeek = tasks.length;

  return (
    <PageWrapper
      title={student?.name || "Student Profile"}
      subtitle={student?.email || `Student ID: ${id}`}
    >
      <div className="space-y-6">
        {/* Student info card */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-lg font-semibold text-[var(--color-accent)]">
                {(student?.name || "?")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {student?.name || "Loading..."}
                </h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {student?.createdAt
                    ? `Enrolled since ${new Date(student.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
                    : "Enrolled since --"}
                </p>
              </div>
            </div>

            {/* Week progress summary */}
            <div className="text-right">
              <p className="text-xs text-[var(--color-text-muted)]">
                Week {selectedWeek} Progress
              </p>
              <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                {completedThisWeek}/{totalThisWeek}
              </p>
            </div>
          </div>
        </div>

        {/* Tone of Voice Review Card */}
        {tovGuide && (
          <div
            className={`rounded-[var(--radius-lg)] border p-5 shadow-[var(--shadow-sm)] ${
              tovGuide.status === "draft"
                ? "border-[var(--color-warning)] bg-[var(--color-warning-light)]"
                : tovGuide.status === "review"
                  ? "border-blue-300 bg-blue-50"
                  : "border-emerald-300 bg-emerald-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Status icon */}
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    tovGuide.status === "draft"
                      ? "bg-[var(--color-warning-light)] text-[var(--color-warning)]"
                      : tovGuide.status === "review"
                        ? "bg-blue-200 text-blue-700"
                        : "bg-emerald-200 text-emerald-700"
                  }`}
                >
                  {tovGuide.status === "active" ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                  )}
                </div>

                <div>
                  <p
                    className={`text-sm font-medium ${
                      tovGuide.status === "draft"
                        ? "text-[var(--color-warning)]"
                        : tovGuide.status === "review"
                          ? "text-blue-800"
                          : "text-emerald-800"
                    }`}
                  >
                    {tovGuide.status === "draft" &&
                      "This student's Tone of Voice Guide needs review"}
                    {tovGuide.status === "review" &&
                      "Tone of Voice Guide is under review"}
                    {tovGuide.status === "active" &&
                      "Tone of Voice Guide is active"}
                  </p>
                  <p
                    className={`mt-0.5 text-xs ${
                      tovGuide.status === "draft"
                        ? "text-[var(--color-warning)]"
                        : tovGuide.status === "review"
                          ? "text-blue-600"
                          : "text-emerald-600"
                    }`}
                  >
                    Version {tovGuide.version} &middot;{" "}
                    {tovGuide.parameters.length} parameters
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Action buttons based on status */}
                {tovGuide.status !== "active" && (
                  <button
                    onClick={() => handleTovStatusChange("active")}
                    disabled={tovUpdating}
                    className="rounded-[var(--radius-md)] bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {tovUpdating ? "Updating..." : "Approve & Activate"}
                  </button>
                )}

                {tovGuide.status === "draft" && (
                  <button
                    onClick={() => handleTovStatusChange("review")}
                    disabled={tovUpdating}
                    className="rounded-[var(--radius-md)] bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    Mark as Reviewing
                  </button>
                )}

                {tovGuide.status === "active" && (
                  <button
                    onClick={() => handleTovStatusChange("review")}
                    disabled={tovUpdating}
                    className="rounded-[var(--radius-md)] bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    Send Back for Review
                  </button>
                )}

                {tovGuide.status === "review" && (
                  <button
                    onClick={() => handleTovStatusChange("draft")}
                    disabled={tovUpdating}
                    className="rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--color-warning)] transition-colors hover:bg-[var(--color-warning-light)] disabled:opacity-50"
                  >
                    Send Back to Draft
                  </button>
                )}

                <button
                  onClick={() => setShowTovEditor(!showTovEditor)}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                >
                  {showTovEditor ? "Hide Editor" : "Review Tone of Voice"}
                </button>
              </div>
            </div>

            {/* Inline Tone of Voice Editor */}
            {showTovEditor && (
              <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
                <ToneOfVoiceEditor
                  initialParameters={tovGuide.parameters}
                  initialSummary=""
                  status={tovGuide.status}
                  onSave={handleTovSave}
                  onStatusChange={handleTovStatusChange}
                />
              </div>
            )}
          </div>
        )}

        {/* Week selector */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
            12-Week Plan
          </h3>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((week) => (
              <button
                key={week}
                onClick={() => setSelectedWeek(week)}
                className={`rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedWeek === week
                    ? "bg-[var(--color-accent)] text-[var(--color-bg-dark)]"
                    : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)]"
                }`}
              >
                W{week}
              </button>
            ))}
          </div>
        </div>

        {/* Add task button */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Week {selectedWeek} Tasks
          </h3>
          <button
            onClick={() => {
              setNewTask((prev) => ({ ...prev, weekNumber: selectedWeek }));
              setShowAddForm(!showAddForm);
            }}
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)]"
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
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Assign Task
          </button>
        </div>

        {/* Add task form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateTask}
            className="animate-fadeIn rounded-[var(--radius-lg)] border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] p-5 shadow-[var(--shadow-sm)]"
          >
            <h4 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
              New Task for Week {newTask.weekNumber}
            </h4>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Title */}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g., Watch Module 3: Scripting Basics"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Optional details..."
                  rows={2}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none resize-none"
                />
              </div>

              {/* Type */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Task Type
                </label>
                <select
                  value={newTask.type}
                  onChange={(e) =>
                    setNewTask((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={newTask.dueDate}
                  onChange={(e) =>
                    setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                />
              </div>

              {/* Day of Week */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Day of Week
                </label>
                <select
                  value={newTask.dayOfWeek}
                  onChange={(e) =>
                    setNewTask((prev) => ({
                      ...prev,
                      dayOfWeek: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                >
                  {DAY_NAMES.map((name, i) => (
                    <option key={i} value={i}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Order */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Sort Order
                </label>
                <input
                  type="number"
                  min={0}
                  value={newTask.order}
                  onChange={(e) =>
                    setNewTask((prev) => ({
                      ...prev,
                      order: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                />
              </div>

              {/* Video URL */}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Video URL (optional)
                </label>
                <input
                  type="url"
                  value={newTask.embeddedVideoUrl}
                  onChange={(e) =>
                    setNewTask((prev) => ({
                      ...prev,
                      embeddedVideoUrl: e.target.value,
                    }))
                  }
                  placeholder="https://www.youtube.com/embed/..."
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                />
              </div>
            </div>

            {/* Form actions */}
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Task"}
              </button>
            </div>
          </form>
        )}

        {/* Tasks by day */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)]"
              />
            ))}
          </div>
        )}

        {!loading && tasks.length === 0 && (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              No tasks assigned for Week {selectedWeek} yet. Use the button
              above to assign tasks.
            </p>
          </div>
        )}

        {!loading &&
          DAY_NAMES.map((dayName, dayIndex) => {
            const dayTasks = tasksByDay[dayIndex];
            if (!dayTasks || dayTasks.length === 0) return null;

            return (
              <div key={dayIndex}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {dayName}
                </h4>
                <div className="space-y-3">
                  {dayTasks.map((task) => {
                    if (editingTask === task._id) {
                      return (
                        <div
                          key={task._id}
                          className="animate-fadeIn rounded-[var(--radius-lg)] border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] p-4"
                        >
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <input
                                type="text"
                                value={editForm.title}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    title: e.target.value,
                                  }))
                                }
                                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <textarea
                                value={editForm.description}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    description: e.target.value,
                                  }))
                                }
                                rows={2}
                                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none resize-none"
                              />
                            </div>
                            <select
                              value={editForm.type}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  type: e.target.value,
                                }))
                              }
                              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                            >
                              {TASK_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={editForm.dueDate}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  dueDate: e.target.value,
                                }))
                              }
                              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                            />
                            <select
                              value={editForm.dayOfWeek}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  dayOfWeek: parseInt(e.target.value, 10),
                                }))
                              }
                              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                            >
                              {DAY_NAMES.map((name, i) => (
                                <option key={i} value={i}>
                                  {name}
                                </option>
                              ))}
                            </select>
                            <div className="sm:col-span-2">
                              <input
                                type="url"
                                value={editForm.embeddedVideoUrl}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    embeddedVideoUrl: e.target.value,
                                  }))
                                }
                                placeholder="Video URL (optional)"
                                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              onClick={() => setEditingTask(null)}
                              className="rounded-[var(--radius-md)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEdit(task._id)}
                              className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-[var(--color-bg-dark)] hover:bg-[var(--color-accent-hover)]"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={task._id} className="group relative">
                        <TaskCard
                          task={task}
                          currentUserId={coachId}
                          onStatusChange={handleStatusChange}
                          onAddComment={handleAddComment}
                        />
                        {/* Admin action buttons */}
                        <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => handleStartEdit(task)}
                            className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-1.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
                            title="Edit task"
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
                                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task._id)}
                            className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-1.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-error)]"
                            title="Delete task"
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
                                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

        {/* Quick links to other sections */}
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              title: "Brand Brain",
              description: "View and edit this student's AI context.",
            },
            {
              title: "Content Pipeline",
              description: "Ideas, scripts, and published content.",
            },
            {
              title: "Voice Storms",
              description: "All recorded voice sessions.",
            },
          ].map((section) => (
            <div
              key={section.title}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]"
            >
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                {section.title}
              </h3>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {section.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
