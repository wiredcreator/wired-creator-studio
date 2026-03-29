"use client";

import { useState, useEffect, useCallback } from "react";
import PageWrapper from "@/components/PageWrapper";

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: "coach" | "admin";
  createdAt: string;
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", role: "coach" as "coach" | "admin" });
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const fetchTeam = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/team");
      if (res.ok) {
        const data = await res.json();
        setTeam(data.team || []);
      }
    } catch (err) {
      console.error("Error fetching team:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  async function handleAdd() {
    if (!addForm.email.trim()) return;
    setAddError("");
    setAddLoading(true);

    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addForm.email.trim(), role: addForm.role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAddError(data.error || "Failed to add team member");
        return;
      }

      setShowAddModal(false);
      setAddForm({ email: "", role: "coach" });
      await fetchTeam();
    } catch {
      setAddError("Something went wrong");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleChangeRole(id: string, newRole: "coach" | "admin") {
    try {
      const res = await fetch(`/api/admin/team/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        await fetchTeam();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update role");
      }
    } catch {
      alert("Something went wrong");
    }
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Remove ${name} from the team? They will be demoted to a student.`)) return;

    try {
      const res = await fetch(`/api/admin/team/${id}`, { method: "DELETE" });

      if (res.ok) {
        await fetchTeam();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to remove team member");
      }
    } catch {
      alert("Something went wrong");
    }
  }

  return (
    <PageWrapper title="Team" subtitle="Manage team members and their roles.">
      <div className="space-y-6">
        {/* Header with add button */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-muted)]">
            {team.length} team member{team.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={() => {
              setAddForm({ email: "", role: "coach" });
              setAddError("");
              setShowAddModal(true);
            }}
            className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            + Add Team Member
          </button>
        </div>

        {/* Team list */}
        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-bg-card)]"
              />
            ))}
          </div>
        )}

        {!loading && team.length === 0 && (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              No team members yet. Add someone by their email address.
            </p>
          </div>
        )}

        {!loading && team.length > 0 && (
          <div className="space-y-3">
            {team.map((member) => (
              <div
                key={member._id}
                className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-sm font-semibold text-[var(--color-accent)]">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                        {member.name}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          member.role === "admin"
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {member.role}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {member.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Role toggle */}
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleChangeRole(member._id, e.target.value as "coach" | "admin")
                    }
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none ring-0"
                  >
                    <option value="coach">Coach</option>
                    <option value="admin">Admin</option>
                  </select>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(member._id, member.name)}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2 text-[var(--color-text-muted)] transition-colors hover:text-red-400"
                    title="Remove from team"
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
                        d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add team member modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="mx-4 w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-[var(--shadow-lg)]">
              <h3 className="mb-1 text-lg font-semibold text-[var(--color-text-primary)]">
                Add Team Member
              </h3>
              <p className="mb-5 text-sm text-[var(--color-text-muted)]">
                Enter the email of an existing user to promote them.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="user@example.com"
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none ring-0"
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
                    Role
                  </label>
                  <div className="flex gap-3">
                    {(["coach", "admin"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setAddForm({ ...addForm, role: r })}
                        className={`flex-1 rounded-[var(--radius-md)] border px-4 py-2 text-sm font-medium transition-colors ${
                          addForm.role === r
                            ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                            : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
                        }`}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {addError && (
                  <p className="text-sm text-red-400">{addError}</p>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={addLoading || !addForm.email.trim()}
                  className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                >
                  {addLoading ? "Adding..." : "Add to Team"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
