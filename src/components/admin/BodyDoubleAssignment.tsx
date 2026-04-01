"use client";

import { useState, useEffect } from "react";

interface StudentOption {
  _id: string;
  name: string;
  email: string;
}

interface BodyDoubleAssignmentProps {
  studentId: string;
  currentPartnerName?: string;
}

export default function BodyDoubleAssignment({
  studentId,
  currentPartnerName,
}: BodyDoubleAssignmentProps) {
  const [partnerName, setPartnerName] = useState(currentPartnerName || "");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Fetch current partner info on mount
  useEffect(() => {
    async function fetchPartner() {
      try {
        const res = await fetch(`/api/admin/body-double?studentId=${studentId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.partner) {
            setPartnerName(data.partner.name);
          }
        }
      } catch {
        // Ignore
      }
    }

    if (!currentPartnerName) {
      fetchPartner();
    }
  }, [studentId, currentPartnerName]);

  // Fetch student list for dropdown
  useEffect(() => {
    async function fetchStudents() {
      setLoadingStudents(true);
      try {
        const res = await fetch("/api/admin/students");
        if (res.ok) {
          const data = await res.json();
          // Filter out the current student
          const filtered = (data.students || [])
            .filter((s: StudentOption) => s._id !== studentId)
            .map((s: StudentOption) => ({
              _id: s._id,
              name: s.name,
              email: s.email,
            }));
          setStudents(filtered);
        }
      } catch {
        // Ignore
      } finally {
        setLoadingStudents(false);
      }
    }

    fetchStudents();
  }, [studentId]);

  async function handleAssign() {
    if (!selectedPartnerId) return;

    const selected = students.find((s) => s._id === selectedPartnerId);
    if (!selected) return;

    // Optimistic update
    const prevName = partnerName;
    setPartnerName(selected.name);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/body-double", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, partnerId: selectedPartnerId }),
      });

      if (!res.ok) {
        // Roll back
        setPartnerName(prevName);
      } else {
        setSelectedPartnerId("");
      }
    } catch {
      setPartnerName(prevName);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    const prevName = partnerName;
    // Optimistic update
    setPartnerName("");
    setRemoving(true);

    try {
      const res = await fetch("/api/admin/body-double", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, partnerId: null }),
      });

      if (!res.ok) {
        setPartnerName(prevName);
      }
    } catch {
      setPartnerName(prevName);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]">
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
        Body Double
      </h3>

      {partnerName ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-semibold text-white">
              {partnerName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-[var(--color-text-primary)]">
              {partnerName}
            </span>
          </div>
          <button
            onClick={handleRemove}
            disabled={removing}
            className="rounded-[var(--radius-md)] px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
          >
            {removing ? "Removing..." : "Remove"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm italic text-[var(--color-text-muted)]">
            No partner assigned
          </p>

          <div className="flex gap-2">
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              disabled={loadingStudents}
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none ring-0"
            >
              <option value="">
                {loadingStudents ? "Loading..." : "Select a student"}
              </option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAssign}
              disabled={!selectedPartnerId || loading}
              className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Assigning..." : "Assign"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
