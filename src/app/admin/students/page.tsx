"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";
import ModalPortal from "@/components/ModalPortal";
import { useTimezone } from "@/hooks/useTimezone";

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
  accessStatus: string;
  subscriptionTier: string;
}

type StatusFilter = 'all' | 'active' | 'past_due' | 'canceled' | 'expired';
type PlanFilter = 'all' | 'full_program' | 'trial' | 'monthly' | 'accelerator';
type RiskFilter = 'all' | 'good' | 'at_risk' | 'flagged';

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  past_due: 'Paused',
  canceled: 'Churned',
  expired: 'Churned',
  none: 'Active',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  past_due: { bg: 'rgba(234,179,8,0.15)', text: '#eab308' },
  canceled: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  expired: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  none: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
};

const PLAN_LABELS: Record<string, string> = {
  full_program: 'Full Program',
  trial: 'Trial',
  monthly: 'SaaS Only',
  accelerator: 'Accelerator',
  none: 'None',
};

function getRiskLevel(flags: string[]): 'good' | 'at_risk' | 'flagged' {
  if (flags.length >= 2) return 'flagged';
  if (flags.length === 1) return 'at_risk';
  return 'good';
}

const RISK_LABELS: Record<string, string> = {
  good: 'Good',
  at_risk: 'At-Risk',
  flagged: 'Flagged',
};

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  good: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  at_risk: { bg: 'rgba(234,179,8,0.15)', text: '#eab308' },
  flagged: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
};

interface AdminStats {
  activeStudents: number;
  tasksDueToday: number;
  pendingReviews: number;
  stuckStudents: number;
}

function formatRelativeDate(
  dateStr: string | null,
  formatDateFn: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string
): string {
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
  return formatDateFn(date, { month: "short", day: "numeric" });
}

export default function AdminStudentsPage() {
  const { formatDate, formatDateTime } = useTimezone();
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
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
  const [riskPopoverStudentId, setRiskPopoverStudentId] = useState<string | null>(null);
  const [riskPopoverPos, setRiskPopoverPos] = useState<{ top: number; left: number; openAbove: boolean } | null>(null);
  const riskPopoverRef = useRef<HTMLDivElement>(null);

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

  // Close risk popover on click outside
  useEffect(() => {
    if (!riskPopoverStudentId) return;
    function handleClickOutside(e: MouseEvent) {
      if (riskPopoverRef.current && !riskPopoverRef.current.contains(e.target as Node)) {
        setRiskPopoverStudentId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [riskPopoverStudentId]);

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

  const filteredStudents = students.filter((s) => {
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) && !s.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== 'all') {
      const sStatus = s.accessStatus || 'active';
      if (statusFilter === 'canceled' && sStatus !== 'canceled' && sStatus !== 'expired') return false;
      if (statusFilter !== 'canceled' && sStatus !== statusFilter) return false;
    }
    if (planFilter !== 'all' && s.subscriptionTier !== planFilter) return false;
    if (riskFilter !== 'all' && getRiskLevel(s.riskFlags) !== riskFilter) return false;
    return true;
  });

  return (
    <PageWrapper
      title="Students"
      subtitle="Overview of all students and their progress."
      wide
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

        {/* Search + Filters + Add Student */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full max-w-[220px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none ring-0"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none ring-0"
          >
            <option value="all">Status</option>
            <option value="active">Active</option>
            <option value="past_due">Paused</option>
            <option value="canceled">Churned</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as PlanFilter)}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none ring-0"
          >
            <option value="all">Plan</option>
            <option value="full_program">Full Program</option>
            <option value="trial">Trial</option>
            <option value="monthly">SaaS Only</option>
            <option value="accelerator">Accelerator</option>
          </select>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none ring-0"
          >
            <option value="all">Risk</option>
            <option value="good">Good</option>
            <option value="at_risk">At-Risk</option>
            <option value="flagged">Flagged</option>
          </select>
          <div className="flex-1" />
          <span className="text-xs text-[var(--color-text-muted)]">
            {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
          </span>
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
          <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddModal(false)}>
            <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
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
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none ring-0"
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
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none ring-0"
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
          </ModalPortal>
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
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-sm)]">
            <table className="w-full min-w-[900px] table-fixed">
              <colgroup>
                <col />
                <col />
                <col className="w-[90px]" />
                <col className="w-[100px]" />
                <col className="w-[96px]" />
                <col className="w-[80px]" />
                <col className="w-[108px]" />
                <col className="w-[88px]" />
                <col className="w-[40px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Email
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Status
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Start Date
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    XP
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Risk
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Activity
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    Plan
                  </th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-light)]">
                {filteredStudents.map((student) => {
                  const risk = getRiskLevel(student.riskFlags);
                  const riskColor = RISK_COLORS[risk];
                  const statusKey = student.accessStatus || 'active';
                  const statusColor = STATUS_COLORS[statusKey] || STATUS_COLORS.active;
                  const planLabel = PLAN_LABELS[student.subscriptionTier] || student.subscriptionTier || 'None';

                  return (
                    <tr key={student._id} className="transition-colors hover:bg-[var(--color-bg-secondary)]">
                      {/* Name */}
                      <td className="px-5 py-4 overflow-hidden">
                        <Link href={`/admin/students/${student._id}`} className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-xs font-semibold text-[var(--color-accent)]">
                            {student.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                            {student.name}
                          </p>
                        </Link>
                      </td>
                      {/* Email */}
                      <td className="px-4 py-4 text-xs text-[var(--color-text-muted)] truncate overflow-hidden">
                        {student.email}
                      </td>
                      {/* Status */}
                      <td className="px-3 py-4 text-center">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
                        >
                          {STATUS_LABELS[statusKey] || 'Active'}
                        </span>
                      </td>
                      {/* Start Date */}
                      <td className="px-3 py-4 text-xs text-[var(--color-text-muted)]">
                        {formatDate(student.createdAt, { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      {/* XP Earned */}
                      <td className="px-3 py-4 text-center">
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {student.lifetimeXP.toLocaleString()}
                        </span>
                      </td>
                      {/* Risk */}
                      <td className="px-3 py-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (riskPopoverStudentId === student._id) {
                              setRiskPopoverStudentId(null);
                              setRiskPopoverPos(null);
                            } else {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const openAbove = spaceBelow < 300;
                              setRiskPopoverPos({
                                top: openAbove ? rect.top - 4 : rect.bottom + 4,
                                left: rect.left + rect.width / 2,
                                openAbove,
                              });
                              setRiskPopoverStudentId(student._id);
                            }
                          }}
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: riskColor.bg, color: riskColor.text }}
                        >
                          {RISK_LABELS[risk]}
                        </button>
                      </td>
                      {/* Last Activity */}
                      <td className="px-3 py-4 text-right text-xs text-[var(--color-text-muted)]">
                        {formatRelativeDate(student.lastActiveDate, formatDate)}
                      </td>
                      {/* Plan */}
                      <td className="px-3 py-4 text-right">
                        <span className="text-xs font-medium text-[var(--color-accent)]">
                          {planLabel}
                        </span>
                      </td>
                      <td className="px-2 py-4">
                        <Link href={`/admin/students/${student._id}`}>
                          <svg className="h-4 w-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
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

        {/* Risk Popover Portal */}
        {riskPopoverStudentId && riskPopoverPos && (() => {
          const student = students.find((s) => s._id === riskPopoverStudentId);
          if (!student) return null;
          const risk = getRiskLevel(student.riskFlags);
          const riskColor = RISK_COLORS[risk];
          return (
            <ModalPortal>
              <div className="fixed inset-0 z-50" onClick={() => { setRiskPopoverStudentId(null); setRiskPopoverPos(null); }}>
                <div
                  ref={riskPopoverRef}
                  className="absolute w-72 max-h-[280px] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg p-4 text-left"
                  style={{
                    top: riskPopoverPos.openAbove ? undefined : riskPopoverPos.top,
                    bottom: riskPopoverPos.openAbove ? `${window.innerHeight - riskPopoverPos.top}px` : undefined,
                    left: riskPopoverPos.left,
                    transform: 'translateX(-50%)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                    Risk Factors
                  </h4>
                  {student.riskFlags.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)]">
                      No risk factors identified. Student appears on track.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {student.riskFlags.map((flag, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: riskColor.text }} />
                          {flag}
                        </li>
                      ))}
                    </ul>
                  )}
                  {student.lastActiveDate === null && (
                    <p className="mt-2 text-xs text-[var(--color-text-muted)] italic border-t border-[var(--color-border)] pt-2">
                      Student has never logged in.
                    </p>
                  )}
                </div>
              </div>
            </ModalPortal>
          );
        })()}
      </div>
    </PageWrapper>
  );
}
