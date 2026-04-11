"use client";

import { useState, useEffect, useCallback } from "react";
import PageWrapper from "@/components/PageWrapper";
import ModalPortal from "@/components/ModalPortal";

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: "admin";
  createdAt: string;
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState("");
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
    if (!addEmail.trim()) return;
    setAddError("");
    setAddLoading(true);

    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail.trim(), role: "admin" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAddError(data.error || "Failed to add team member");
        return;
      }

      setShowAddModal(false);
      setAddEmail("");
      await fetchTeam();
    } catch {
      setAddError("Something went wrong");
    } finally {
      setAddLoading(false);
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
    <PageWrapper title="Team" subtitle="Manage team members.">
      <div className="space-y-6">
        {/* Header with add button */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-muted)]">
            {team.length} team member{team.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={() => {
              setAddEmail("");
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
                      <span className="inline-flex items-center rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-400">
                        Admin
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {member.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
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
          <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddModal(false)}>
            <div className="mx-4 w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-[var(--shadow-lg)]" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-1 text-lg font-semibold text-[var(--color-text-primary)]">
                Add Team Member
              </h3>
              <p className="mb-5 text-sm text-[var(--color-text-muted)]">
                Enter an email to promote to admin. If no account exists, one will be created automatically.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none ring-0"
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  />
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
                  disabled={addLoading || !addEmail.trim()}
                  className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                >
                  {addLoading ? "Adding..." : "Add to Team"}
                </button>
              </div>
            </div>
          </div>
          </ModalPortal>
        )}
      </div>
    </PageWrapper>
  );
}
