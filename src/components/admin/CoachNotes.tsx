"use client";

import { useState, useEffect, useCallback } from "react";

interface CoachNoteData {
  _id: string;
  text: string;
  authorId: { _id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function CoachNotes({ studentId }: { studentId: string }) {
  const [notes, setNotes] = useState<CoachNoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [newText, setNewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/notes?studentId=${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error("Failed to fetch coach notes:", err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAdd = async () => {
    const trimmed = newText.trim();
    if (!trimmed || submitting) return;

    // Optimistic add
    const tempId = `temp-${Date.now()}`;
    const optimisticNote: CoachNoteData = {
      _id: tempId,
      text: trimmed,
      authorId: { _id: "", name: "You" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setNotes((prev) => [optimisticNote, ...prev]);
    setNewText("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, text: trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        // Replace optimistic note with real one
        setNotes((prev) =>
          prev.map((n) => (n._id === tempId ? data.note : n))
        );
      } else {
        // Roll back
        setNotes((prev) => prev.filter((n) => n._id !== tempId));
      }
    } catch {
      // Roll back
      setNotes((prev) => prev.filter((n) => n._id !== tempId));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (noteId: string) => {
    const trimmed = editText.trim();
    if (!trimmed) return;

    const original = notes.find((n) => n._id === noteId);
    if (!original) return;

    // Optimistic update
    setNotes((prev) =>
      prev.map((n) => (n._id === noteId ? { ...n, text: trimmed } : n))
    );
    setEditingId(null);

    try {
      const res = await fetch(`/api/admin/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        setNotes((prev) =>
          prev.map((n) => (n._id === noteId ? data.note : n))
        );
      } else {
        // Roll back
        setNotes((prev) =>
          prev.map((n) => (n._id === noteId ? original : n))
        );
      }
    } catch {
      setNotes((prev) =>
        prev.map((n) => (n._id === noteId ? original : n))
      );
    }
  };

  const handleDelete = async (noteId: string) => {
    const original = notes.find((n) => n._id === noteId);
    if (!original) return;

    // Optimistic delete
    setNotes((prev) => prev.filter((n) => n._id !== noteId));
    setDeletingId(null);

    try {
      const res = await fetch(`/api/admin/notes/${noteId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        // Roll back
        setNotes((prev) => {
          const restored = [...prev];
          // Insert back at original position (approximately)
          restored.push(original);
          restored.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          return restored;
        });
      }
    } catch {
      setNotes((prev) => {
        const restored = [...prev];
        restored.push(original);
        restored.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return restored;
      });
    }
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)]">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`h-4 w-4 text-[var(--color-text-muted)] transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Coach Notes
          </h3>
          {!loading && (
            <span className="rounded-full bg-[var(--color-bg-secondary)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
              {notes.length}
            </span>
          )}
        </div>
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="border-t border-[var(--color-border)] px-5 py-4 space-y-4">
          {/* Add note form */}
          <div className="space-y-2">
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Add a private note about this student..."
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none ring-0 resize-none"
            />
            <div className="flex justify-end">
              <button
                onClick={handleAdd}
                disabled={!newText.trim() || submitting}
                className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add Note"}
              </button>
            </div>
          </div>

          {/* Notes list */}
          {loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              Loading notes...
            </p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No notes yet. Add a private note above.
            </p>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note._id}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3"
                >
                  {/* Note header */}
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {note.authorId?.name || "Unknown"}
                      </span>
                      <span>{relativeTime(note.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Edit button */}
                      <button
                        onClick={() => {
                          setEditingId(note._id);
                          setEditText(note.text);
                        }}
                        className="rounded p-1 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                        title="Edit note"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      {/* Delete button */}
                      {deletingId === note._id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(note._id)}
                            className="rounded px-2 py-0.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="rounded px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(note._id)}
                          className="rounded p-1 text-[var(--color-text-muted)] transition-colors hover:text-red-400"
                          title="Delete note"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Note content or edit form */}
                  {editingId === note._id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none ring-0 resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-[var(--radius-md)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleEdit(note._id)}
                          disabled={!editText.trim()}
                          className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
                      {note.text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
