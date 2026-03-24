"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";

interface StudentWithStats {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  totalTasks: number;
  completedTasks: number;
  todayTasks: number;
  todayCompleted: number;
}

interface CustomPrompt {
  _id: string;
  name: string;
  category: string;
  promptText: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type PromptCategory =
  | "script_generation"
  | "idea_generation"
  | "side_quest_generation"
  | "brain_dump_processing"
  | "tone_of_voice";

const CATEGORY_LABELS: Record<PromptCategory, string> = {
  script_generation: "Script Generation",
  idea_generation: "Idea Generation",
  side_quest_generation: "Side Quest Generation",
  brain_dump_processing: "Brain Dump Processing",
  tone_of_voice: "Tone of Voice",
};

function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}

type AdminTab = "students" | "prompts";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("students");
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeStudents: 0,
    tasksDueToday: 0,
    pendingReviews: 0,
  });

  // Prompts state
  const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [showPromptForm, setShowPromptForm] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [promptForm, setPromptForm] = useState({
    name: "",
    category: "script_generation" as PromptCategory,
    promptText: "",
    isActive: true,
  });
  const [promptSaving, setPromptSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch all students
        const usersRes = await fetch("/api/users?role=student");
        let studentsList: StudentWithStats[] = [];

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          studentsList = (usersData || []).map(
            (u: { _id: string; name: string; email: string; createdAt: string }) => ({
              ...u,
              totalTasks: 0,
              completedTasks: 0,
              todayTasks: 0,
              todayCompleted: 0,
            })
          );
        }

        // Fetch task stats for each student
        const today = getTodayISO();
        let totalDueToday = 0;
        let totalPendingReviews = 0;

        for (const student of studentsList) {
          try {
            // Get all tasks for the student
            const allTasksRes = await fetch(
              `/api/tasks?userId=${student._id}`
            );
            if (allTasksRes.ok) {
              const allTasks = await allTasksRes.json();
              student.totalTasks = allTasks.length;
              student.completedTasks = allTasks.filter(
                (t: { status: string }) => t.status === "completed"
              ).length;
            }

            // Get today's tasks
            const todayRes = await fetch(
              `/api/tasks?userId=${student._id}&date=${today}`
            );
            if (todayRes.ok) {
              const todayTasks = await todayRes.json();
              student.todayTasks = todayTasks.length;
              student.todayCompleted = todayTasks.filter(
                (t: { status: string }) => t.status === "completed"
              ).length;
              totalDueToday += student.todayTasks;

              // Count submit_content and review_script tasks that are pending
              totalPendingReviews += todayTasks.filter(
                (t: { status: string; type: string }) =>
                  (t.type === "submit_content" || t.type === "review_script") &&
                  t.status === "pending"
              ).length;
            }
          } catch {
            // Skip stats for this student on error
          }
        }

        setStudents(studentsList);
        setStats({
          activeStudents: studentsList.length,
          tasksDueToday: totalDueToday,
          pendingReviews: totalPendingReviews,
        });
      } catch (err) {
        console.error("Error fetching admin data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const fetchPrompts = useCallback(async () => {
    try {
      setPromptsLoading(true);
      const res = await fetch("/api/admin/prompts");
      if (res.ok) {
        const data = await res.json();
        setPrompts(data);
      }
    } catch (err) {
      console.error("Error fetching prompts:", err);
    } finally {
      setPromptsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "prompts") {
      fetchPrompts();
    }
  }, [activeTab, fetchPrompts]);

  function openCreateForm() {
    setEditingPrompt(null);
    setPromptForm({
      name: "",
      category: "script_generation",
      promptText: "",
      isActive: true,
    });
    setShowPromptForm(true);
  }

  function openEditForm(prompt: CustomPrompt) {
    setEditingPrompt(prompt);
    setPromptForm({
      name: prompt.name,
      category: prompt.category as PromptCategory,
      promptText: prompt.promptText,
      isActive: prompt.isActive,
    });
    setShowPromptForm(true);
  }

  async function handleSavePrompt() {
    if (!promptForm.name.trim() || !promptForm.promptText.trim()) return;

    setPromptSaving(true);
    try {
      if (editingPrompt) {
        // Update
        const res = await fetch(`/api/admin/prompts/${editingPrompt._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(promptForm),
        });
        if (!res.ok) throw new Error("Failed to update prompt");
      } else {
        // Create
        const res = await fetch("/api/admin/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(promptForm),
        });
        if (!res.ok) throw new Error("Failed to create prompt");
      }
      setShowPromptForm(false);
      setEditingPrompt(null);
      await fetchPrompts();
    } catch (err) {
      console.error("Error saving prompt:", err);
    } finally {
      setPromptSaving(false);
    }
  }

  async function handleDeletePrompt(id: string) {
    if (!confirm("Are you sure you want to delete this prompt?")) return;
    try {
      const res = await fetch(`/api/admin/prompts/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchPrompts();
      }
    } catch (err) {
      console.error("Error deleting prompt:", err);
    }
  }

  async function handleToggleActive(prompt: CustomPrompt) {
    try {
      const res = await fetch(`/api/admin/prompts/${prompt._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !prompt.isActive }),
      });
      if (res.ok) {
        await fetchPrompts();
      }
    } catch (err) {
      console.error("Error toggling prompt:", err);
    }
  }

  return (
    <PageWrapper
      title="Coach Dashboard"
      subtitle="Overview of all students and their progress."
    >
      <div className="space-y-6">
        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Active Students",
              value: loading ? "--" : String(stats.activeStudents),
            },
            {
              label: "Tasks Due Today",
              value: loading ? "--" : String(stats.tasksDueToday),
            },
            {
              label: "Pending Reviews",
              value: loading ? "--" : String(stats.pendingReviews),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]"
            >
              <p className="text-sm text-[var(--color-text-muted)]">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-1">
          {(["students", "prompts"] as AdminTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {tab === "students" ? "Students" : "AI Prompts"}
            </button>
          ))}
        </div>

        {/* Students tab */}
        {activeTab === "students" && (
          <div>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              Students
            </h2>

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

            {!loading && students.length === 0 && (
              <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
                <p className="text-sm text-[var(--color-text-muted)]">
                  No students enrolled yet.
                </p>
              </div>
            )}

            {!loading && students.length > 0 && (
              <div className="space-y-3">
                {students.map((student) => {
                  const progressPercent =
                    student.totalTasks > 0
                      ? Math.round(
                          (student.completedTasks / student.totalTasks) * 100
                        )
                      : 0;
                  const todayPercent =
                    student.todayTasks > 0
                      ? Math.round(
                          (student.todayCompleted / student.todayTasks) * 100
                        )
                      : 0;

                  return (
                    <Link
                      key={student._id}
                      href={`/admin/students/${student._id}`}
                      className="block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-sm font-semibold text-[var(--color-accent)]">
                            {student.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                              {student.name}
                            </h3>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {student.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          {/* Today's progress */}
                          <div className="text-right">
                            <p className="text-xs text-[var(--color-text-muted)]">
                              Today
                            </p>
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">
                              {student.todayCompleted}/{student.todayTasks}
                              {student.todayTasks > 0 && (
                                <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                                  ({todayPercent}%)
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Overall progress */}
                          <div className="text-right">
                            <p className="text-xs text-[var(--color-text-muted)]">
                              Overall
                            </p>
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">
                              {student.completedTasks}/{student.totalTasks}
                              {student.totalTasks > 0 && (
                                <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                                  ({progressPercent}%)
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Arrow */}
                          <svg
                            className="h-4 w-4 text-[var(--color-text-muted)]"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m8.25 4.5 7.5 7.5-7.5 7.5"
                            />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Prompts tab */}
        {activeTab === "prompts" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Custom AI Prompts
              </h2>
              <button
                onClick={openCreateForm}
                className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                + New Prompt
              </button>
            </div>

            <p className="mb-4 text-sm text-[var(--color-text-muted)]">
              Custom prompts are appended to the default system prompts for each
              AI feature. Active prompts are automatically included when
              generating content for students.
            </p>

            {/* Prompt form modal */}
            {showPromptForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="mx-4 w-full max-w-xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-[var(--shadow-lg)]">
                  <h3 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
                    {editingPrompt ? "Edit Prompt" : "New Custom Prompt"}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
                        Name
                      </label>
                      <input
                        type="text"
                        value={promptForm.name}
                        onChange={(e) =>
                          setPromptForm({ ...promptForm, name: e.target.value })
                        }
                        placeholder="e.g. Energetic Hook Style"
                        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none ring-0"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
                        Category
                      </label>
                      <select
                        value={promptForm.category}
                        onChange={(e) =>
                          setPromptForm({
                            ...promptForm,
                            category: e.target.value as PromptCategory,
                          })
                        }
                        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none ring-0"
                      >
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
                        Prompt Text
                      </label>
                      <textarea
                        value={promptForm.promptText}
                        onChange={(e) =>
                          setPromptForm({
                            ...promptForm,
                            promptText: e.target.value,
                          })
                        }
                        placeholder="Enter the custom instructions to append to the system prompt..."
                        rows={8}
                        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none ring-0"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPromptForm({
                            ...promptForm,
                            isActive: !promptForm.isActive,
                          })
                        }
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                          promptForm.isActive
                            ? "bg-[var(--color-accent)]"
                            : "bg-[var(--color-border)]"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                            promptForm.isActive
                              ? "translate-x-[18px]"
                              : "translate-x-[3px]"
                          }`}
                        />
                      </button>
                      <span className="text-sm text-[var(--color-text-primary)]">
                        Active
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowPromptForm(false);
                        setEditingPrompt(null);
                      }}
                      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePrompt}
                      disabled={
                        promptSaving ||
                        !promptForm.name.trim() ||
                        !promptForm.promptText.trim()
                      }
                      className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                    >
                      {promptSaving
                        ? "Saving..."
                        : editingPrompt
                        ? "Update"
                        : "Create"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Prompts list */}
            {promptsLoading && (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)]"
                  />
                ))}
              </div>
            )}

            {!promptsLoading && prompts.length === 0 && (
              <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
                <p className="text-sm text-[var(--color-text-muted)]">
                  No custom prompts yet. Click &quot;+ New Prompt&quot; to create one.
                </p>
              </div>
            )}

            {!promptsLoading && prompts.length > 0 && (
              <div className="space-y-3">
                {prompts.map((prompt) => (
                  <div
                    key={prompt._id}
                    className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                            {prompt.name}
                          </h3>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              prompt.isActive
                                ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                                : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"
                            }`}
                          >
                            {prompt.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                          {CATEGORY_LABELS[prompt.category as PromptCategory] ||
                            prompt.category}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
                          {prompt.promptText}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(prompt)}
                          title={
                            prompt.isActive ? "Deactivate" : "Activate"
                          }
                          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                        >
                          {prompt.isActive ? (
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 5.25v13.5m-7.5-13.5v13.5"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                              />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => openEditForm(prompt)}
                          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeletePrompt(prompt._id)}
                          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2 text-[var(--color-text-muted)] transition-colors hover:text-red-400"
                        >
                          <svg
                            className="h-4 w-4"
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
