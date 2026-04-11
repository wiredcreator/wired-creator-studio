"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";

interface StudentWithStats {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  onboardingCompleted: boolean;
  personalBaselineCompleted: boolean;
  lifetimeXP: number;
  currentStreak: number;
  lastActiveDate: string | null;
  totalTasks: number;
  completedTasks: number;
  todayTasks: number;
  todayCompleted: number;
  stuckTasks: number;
  riskFlags: string[];
}

interface AdminStats {
  activeStudents: number;
  tasksDueToday: number;
  pendingReviews: number;
  stuckStudents: number;
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState<AdminStats>({
    activeStudents: 0,
    tasksDueToday: 0,
    pendingReviews: 0,
    stuckStudents: 0,
  });

  // Add Student modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/students");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setStats(data.stats || {
          activeStudents: 0,
          tasksDueToday: 0,
          pendingReviews: 0,
          stuckStudents: 0,
        });
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddSuccess("");
    setAddLoading(true);

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail, name: addName || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAddError(data.error || "Failed to add student");
        return;
      }

      setAddSuccess(`Added ${data.user.name} (${data.user.email})`);
      setAddEmail("");
      setAddName("");
      fetchData();

      // Auto-close after a moment
      setTimeout(() => {
        setShowAddModal(false);
        setAddSuccess("");
      }, 1500);
    } catch {
      setAddError("Something went wrong. Please try again.");
    } finally {
      setAddLoading(false);
    }
  }

  const filteredStudents = searchQuery
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : students;

  return (
    <PageWrapper
      title="Students"
      subtitle="Overview of all students and their progress."
    >
      <div className="space-y-6">
        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Active Students", value: stats.activeStudents },
            { label: "Tasks Due Today", value: stats.tasksDueToday },
            { label: "Pending Reviews", value: stats.pendingReviews },
            { label: "Stuck Students", value: stats.stuckStudents, alert: stats.stuckStudents > 0 },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]"
            >
              <p className="text-sm text-[var(--color-text-muted)]">
                {stat.label}
              </p>
              <p className={`mt-1 text-2xl font-semibold ${
                stat.alert
                  ? "text-[var(--color-warning)]"
                  : "text-[var(--color-text-primary)]"
              }`}>
                {loading ? "--" : String(stat.value)}
              </p>
            </div>
          ))}
        </div>

        {/* Search + Add Student */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students by name or email..."
            className="w-full max-w-md rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none ring-0"
          />
          <button
            onClick={() => {
              setShowAddModal(true);
              setAddError("");
              setAddSuccess("");
              setAddEmail("");
              setAddName("");
            }}
            className="shrink-0 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            + Add Student
          </button>
        </div>

        {/* Add Student Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Add Student
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Create a new student account. They can log in via magic link.
              </p>

              <form onSubmit={handleAddStudent} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                    Email <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none ring-0"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                    Name <span className="text-sm font-normal text-[var(--color-text-muted)]">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none ring-0"
                  />
                </div>

                {addError && (
                  <p className="text-sm text-[var(--color-error)]">{addError}</p>
                )}
                {addSuccess && (
                  <p className="text-sm text-green-400">{addSuccess}</p>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-opacity hover:opacity-80"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {addLoading ? "Adding..." : "Add Student"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Student list */}
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

        {!loading && filteredStudents.length === 0 && (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              {searchQuery
                ? "No students match your search."
                : "No students enrolled yet."}
            </p>
          </div>
        )}

        {!loading && filteredStudents.length > 0 && (
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-sm)]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Started
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    XP
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Today
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Overall
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Last Active
                  </th>
                  <th className="w-8 px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-light)]">
                {filteredStudents.map((student) => {
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
                    <tr key={student._id} className="transition-colors hover:bg-[var(--color-bg-secondary)]">
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/students/${student._id}`}
                          className="flex items-center gap-3"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-xs font-semibold text-[var(--color-accent)]">
                            {student.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                              {student.name}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)] truncate">
                              {student.email}
                            </p>
                          </div>
                          {student.stuckTasks > 0 && (
                            <span className="ml-1 inline-flex items-center rounded-full bg-[var(--color-warning-bg,#fef3c7)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-warning,#d97706)]">
                              Stuck
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-xs text-[var(--color-text-muted)]">
                        {formatDate(student.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {student.lifetimeXP.toLocaleString()}
                        </span>
                        {student.currentStreak > 0 && (
                          <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                            ({student.currentStreak}d streak)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {student.todayCompleted}/{student.todayTasks}
                        </span>
                        {student.todayTasks > 0 && (
                          <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                            ({todayPercent}%)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {student.completedTasks}/{student.totalTasks}
                        </span>
                        {student.totalTasks > 0 && (
                          <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                            ({progressPercent}%)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right text-xs text-[var(--color-text-muted)]">
                        {formatRelativeDate(student.lastActiveDate)}
                      </td>
                      <td className="px-3 py-4">
                        <Link href={`/admin/students/${student._id}`}>
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
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
