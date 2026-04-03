"use client";

import { useState, useEffect, useCallback } from "react";
import PageWrapper from "@/components/PageWrapper";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  idea_generation: "Idea Generation",
  script_generation: "Script Generation",
  brain_dump_processing: "Brain Dump Processing",
  tone_of_voice: "Tone of Voice",
  side_quest_generation: "Side Quest Generation",
  content_pillar_generation: "Content Pillar Generation",
  personal_baseline_processing: "Personal Baseline Processing",
  title_generation: "Title Generation",
};

const CATEGORY_COLORS: Record<string, string> = {
  idea_generation: "bg-violet-700 text-white",
  script_generation: "bg-blue-700 text-white",
  brain_dump_processing: "bg-amber-700 text-white",
  tone_of_voice: "bg-teal-700 text-white",
  side_quest_generation: "bg-emerald-700 text-white",
  content_pillar_generation: "bg-rose-700 text-white",
  personal_baseline_processing: "bg-indigo-700 text-white",
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS);

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIDocument {
  _id: string;
  title: string;
  category: string;
  scope: "global" | "user";
  userId?: { _id: string; name: string; email: string } | null;
  content: string;
  sortOrder: number;
  updatedAt: string;
  createdAt: string;
}

const emptyForm = {
  title: "",
  category: "idea_generation",
  content: "",
};

// ─── Helper components ────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const colorClass = CATEGORY_COLORS[category] ?? "bg-gray-700 text-white";
  const label = CATEGORY_LABELS[category] ?? category;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}

function ScopeBadge({
  scope,
  userName,
}: {
  scope: string;
  userName?: string;
}) {
  if (scope === "global") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-[var(--color-bg-secondary)] px-2.5 py-0.5 text-xs font-medium text-white">
        Global
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-[var(--color-bg-secondary)] px-2.5 py-0.5 text-xs font-medium text-white">
      {userName ?? "User"}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-4 w-40 rounded bg-[var(--color-bg-secondary)]" />
        <div className="h-5 w-24 rounded-full bg-[var(--color-bg-secondary)]" />
        <div className="h-5 w-16 rounded-full bg-[var(--color-bg-secondary)]" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-[var(--color-bg-secondary)]" />
        <div className="h-3 w-5/6 rounded bg-[var(--color-bg-secondary)]" />
        <div className="h-3 w-4/6 rounded bg-[var(--color-bg-secondary)]" />
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  editing: AIDocument | null;
  submitting: boolean;
  error: string | null;
  form: typeof emptyForm;
  onChange: (patch: Partial<typeof emptyForm>) => void;
  onSave: () => void;
  onClose: () => void;
}

function DocumentModal({
  editing,
  submitting,
  error,
  form,
  onChange,
  onSave,
  onClose,
}: ModalProps) {
  const isCreate = editing === null;
  const inputClass =
    "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] ring-0";
  const labelClass = "mb-1 block text-xs font-medium text-[var(--color-text-muted)]";

  const [gdocUrl, setGdocUrl] = useState("");
  const [gdocFetching, setGdocFetching] = useState(false);
  const [gdocError, setGdocError] = useState<string | null>(null);

  async function handleGdocFetch() {
    if (!gdocUrl.trim()) return;
    setGdocFetching(true);
    setGdocError(null);
    try {
      const res = await fetch("/api/admin/ai-documents/fetch-gdoc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: gdocUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGdocError(data.error ?? "Failed to fetch document.");
      } else {
        onChange({ content: data.content ?? "" });
        if (!form.title.trim() && data.title) {
          onChange({ title: data.title });
        }
      }
    } catch {
      setGdocError("Network error. Please try again.");
    } finally {
      setGdocFetching(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            {isCreate ? "Add Document" : "Edit Document"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          {/* Title */}
          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Document title"
              className={inputClass}
            />
          </div>

          {/* Category */}
          <div>
            <label className={labelClass}>Category</label>
            <select
              value={form.category}
              onChange={(e) => onChange({ category: e.target.value })}
              className={inputClass}
            >
              {CATEGORY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Google Doc import */}
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3">
            <p className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">
              Import from Google Doc
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={gdocUrl}
                onChange={(e) => {
                  setGdocUrl(e.target.value);
                  setGdocError(null);
                }}
                placeholder="Paste a Google Doc URL..."
                className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] ring-0"
              />
              <button
                onClick={handleGdocFetch}
                disabled={gdocFetching || !gdocUrl.trim()}
                className="shrink-0 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-accent)] hover:text-white disabled:opacity-50"
              >
                {gdocFetching ? "Fetching..." : "Fetch"}
              </button>
            </div>
            {gdocError && (
              <p className="mt-2 text-xs text-red-400">{gdocError}</p>
            )}
          </div>

          {/* Content */}
          <div>
            <label className={labelClass}>Content</label>
            <textarea
              value={form.content}
              onChange={(e) => onChange({ content: e.target.value })}
              rows={14}
              placeholder="Enter the AI document content..."
              className={`${inputClass} resize-y font-mono text-xs leading-relaxed`}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={submitting}
            className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Saving..." : isCreate ? "Create Document" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AIDocumentsPage() {
  const [documents, setDocuments] = useState<AIDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<AIDocument | null>(null);
  const [form, setForm] = useState<typeof emptyForm>({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // ── Fetch documents ──────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      const res = await fetch(`/api/admin/ai-documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ── Open modal ───────────────────────────────────────────────────────────
  function openCreate() {
    setEditingDoc(null);
    setForm({ ...emptyForm });
    setModalError(null);
    setShowModal(true);
  }

  function openEdit(doc: AIDocument) {
    setEditingDoc(doc);
    setForm({
      title: doc.title,
      category: doc.category,
      content: doc.content,
    });
    setModalError(null);
    setShowModal(true);
  }

  function closeModal() {
    if (submitting) return;
    setShowModal(false);
    setEditingDoc(null);
    setModalError(null);
  }

  function patchForm(patch: Partial<typeof emptyForm>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    setModalError(null);

    if (!form.title.trim()) {
      setModalError("Title is required.");
      return;
    }
    if (!form.content.trim()) {
      setModalError("Content is required.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        scope: "global",
        userId: null,
        content: form.content.trim(),
      };

      let res: Response;
      if (editingDoc) {
        res = await fetch(`/api/admin/ai-documents/${editingDoc._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/ai-documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        closeModal();
        await fetchDocuments();
      } else {
        const data = await res.json();
        setModalError(data.error ?? "Failed to save document.");
      }
    } catch {
      setModalError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  async function handleDelete(doc: AIDocument) {
    if (
      !confirm(
        `Delete "${doc.title}"? This cannot be undone and will affect any AI features using this document.`
      )
    )
      return;

    const previous = [...documents];
    setDocuments((prev) => prev.filter((d) => d._id !== doc._id));

    try {
      const res = await fetch(`/api/admin/ai-documents/${doc._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setDocuments(previous);
      }
    } catch {
      setDocuments(previous);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <PageWrapper
        title="AI Documents"
        subtitle="Manage the system prompts and documents injected into AI features."
      >
        <div className="space-y-6">
          {/* Header row: filter + add button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Category filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] ring-0"
            >
              <option value="">All Categories</option>
              {CATEGORY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <div className="flex-1" />

            {/* Add button */}
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
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
              Add Document
            </button>
          </div>

          {/* Document list */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] py-16">
              <svg
                className="mb-3 h-8 w-8 text-[var(--color-text-muted)]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                No AI documents found
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {selectedCategory
                  ? "Try adjusting your filters."
                  : "Create the first document to get started."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc._id}
                  doc={doc}
                  onEdit={() => openEdit(doc)}
                  onDelete={() => handleDelete(doc)}
                />
              ))}
            </div>
          )}
        </div>
      </PageWrapper>

      {/* Modal */}
      {showModal && (
        <DocumentModal
          editing={editingDoc}
          submitting={submitting}
          error={modalError}
          form={form}
          onChange={patchForm}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </>
  );
}

// ─── Document card ────────────────────────────────────────────────────────────

function DocumentCard({
  doc,
  onEdit,
  onDelete,
}: {
  doc: AIDocument;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const previewLines = doc.content.split("\n").slice(0, 3).join("\n");
  const hasMore = doc.content.split("\n").length > 3;

  const updatedAt = new Date(doc.updatedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-sm)]">
      {/* Card header */}
      <div className="flex flex-wrap items-start gap-3 px-5 pt-4 pb-3">
        {/* Left: title + badges */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug">
            {doc.title}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={doc.category} />
            <ScopeBadge
              scope={doc.scope}
              userName={doc.userId?.name}
            />
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onEdit}
            title="Edit"
            className="rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
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
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-muted)] hover:bg-red-500/20 hover:text-red-400"
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
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content preview */}
      <div className="border-t border-[var(--color-border)] px-5 py-3">
        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-[var(--color-text-muted)]">
          {expanded ? doc.content : previewLines}
        </pre>
        {hasMore && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-xs text-[var(--color-accent)] hover:underline"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      {/* Footer: last updated */}
      <div className="border-t border-[var(--color-border)] px-5 py-2.5">
        <p className="text-xs text-[var(--color-text-muted)]">
          Updated {updatedAt}
        </p>
      </div>
    </div>
  );
}
