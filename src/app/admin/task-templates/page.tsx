"use client";

import { useState, useEffect, useCallback } from "react";
import PageWrapper from "@/components/PageWrapper";

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

interface TemplateData {
  _id: string;
  weekNumber: number;
  title: string;
  description: string;
  type: string;
  dayOfWeek: number;
  order: number;
  embeddedVideoUrl?: string;
  isActive: boolean;
}

const emptyForm = {
  title: "",
  description: "",
  type: "custom",
  dayOfWeek: 1,
  order: 0,
  embeddedVideoUrl: "",
};

export default function TaskTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));
  const [addingForWeek, setAddingForWeek] = useState<number | null>(null);
  const [newForm, setNewForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/task-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const toggleWeek = (week: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  };

  const templatesForWeek = (week: number) =>
    templates.filter((t) => t.weekNumber === week);

  const handleAdd = async (weekNumber: number) => {
    if (!newForm.title.trim()) return;
    setSubmitting(true);

    const optimisticId = `temp-${Date.now()}`;
    const optimisticTemplate: TemplateData = {
      _id: optimisticId,
      weekNumber,
      title: newForm.title,
      description: newForm.description,
      type: newForm.type,
      dayOfWeek: newForm.dayOfWeek,
      order: newForm.order,
      embeddedVideoUrl: newForm.embeddedVideoUrl || undefined,
      isActive: true,
    };
    setTemplates((prev) => [...prev, optimisticTemplate]);
    setNewForm(emptyForm);
    setAddingForWeek(null);

    try {
      const res = await fetch("/api/admin/task-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekNumber, ...newForm }),
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates((prev) =>
          prev.map((t) => (t._id === optimisticId ? data.template : t))
        );
      } else {
        setTemplates((prev) => prev.filter((t) => t._id !== optimisticId));
      }
    } catch {
      setTemplates((prev) => prev.filter((t) => t._id !== optimisticId));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id: string) => {
    setSubmitting(true);

    // Optimistic update
    const previous = templates.find((t) => t._id === id);
    setTemplates((prev) =>
      prev.map((t) =>
        t._id === id
          ? { ...t, ...editForm, embeddedVideoUrl: editForm.embeddedVideoUrl || undefined }
          : t
      )
    );
    setEditingId(null);

    try {
      const res = await fetch(`/api/admin/task-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates((prev) =>
          prev.map((t) => (t._id === id ? data.template : t))
        );
      } else if (previous) {
        setTemplates((prev) =>
          prev.map((t) => (t._id === id ? previous : t))
        );
      }
    } catch {
      if (previous) {
        setTemplates((prev) =>
          prev.map((t) => (t._id === id ? previous : t))
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template? This cannot be undone.")) return;

    const previous = templates.find((t) => t._id === id);
    setTemplates((prev) => prev.filter((t) => t._id !== id));

    try {
      const res = await fetch(`/api/admin/task-templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok && previous) {
        setTemplates((prev) => [...prev, previous]);
      }
    } catch {
      if (previous) {
        setTemplates((prev) => [...prev, previous]);
      }
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setTemplates((prev) =>
      prev.map((t) => (t._id === id ? { ...t, isActive: !currentActive } : t))
    );

    try {
      const res = await fetch(`/api/admin/task-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (!res.ok) {
        setTemplates((prev) =>
          prev.map((t) =>
            t._id === id ? { ...t, isActive: currentActive } : t
          )
        );
      }
    } catch {
      setTemplates((prev) =>
        prev.map((t) =>
          t._id === id ? { ...t, isActive: currentActive } : t
        )
      );
    }
  };

  const startEdit = (template: TemplateData) => {
    setEditingId(template._id);
    setEditForm({
      title: template.title,
      description: template.description,
      type: template.type,
      dayOfWeek: template.dayOfWeek,
      order: template.order,
      embeddedVideoUrl: template.embeddedVideoUrl || "",
    });
  };

  const typeLabel = (value: string) =>
    TASK_TYPES.find((t) => t.value === value)?.label || value;

  if (loading) {
    return (
      <PageWrapper title="Task Templates" subtitle="Define reusable task templates for each week of the 16-week program.">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Task Templates"
      subtitle="Define reusable task templates for each week of the 16-week program."
    >
      <div className="space-y-3">
        {Array.from({ length: 16 }, (_, i) => i + 1).map((week) => {
          const weekTemplates = templatesForWeek(week);
          const isExpanded = expandedWeeks.has(week);

          return (
            <div
              key={week}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-sm)]"
            >
              {/* Week header */}
              <button
                onClick={() => toggleWeek(week)}
                className="flex w-full items-center justify-between px-5 py-3.5 text-left focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={`h-4 w-4 text-[var(--color-text-muted)] transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Week {week}
                  </span>
                  <span className="rounded-full bg-[var(--color-bg-secondary)] px-2 py-0.5 text-xs font-medium text-white">
                    {weekTemplates.length} template{weekTemplates.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-[var(--color-border)] px-5 pb-4 pt-3">
                  {weekTemplates.length === 0 && addingForWeek !== week && (
                    <p className="mb-3 text-sm text-[var(--color-text-muted)]">
                      No templates for this week yet.
                    </p>
                  )}

                  {/* Template list */}
                  {weekTemplates.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {weekTemplates.map((tmpl) =>
                        editingId === tmpl._id ? (
                          /* Inline edit form */
                          <div
                            key={tmpl._id}
                            className="rounded-[var(--radius-md)] border border-[var(--color-accent)] bg-[var(--color-bg-secondary)] p-3"
                          >
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                                  Title
                                </label>
                                <input
                                  type="text"
                                  value={editForm.title}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      title: e.target.value,
                                    }))
                                  }
                                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                                  Type
                                </label>
                                <select
                                  value={editForm.type}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      type: e.target.value,
                                    }))
                                  }
                                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                                >
                                  {TASK_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>
                                      {t.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                                  Day
                                </label>
                                <select
                                  value={editForm.dayOfWeek}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      dayOfWeek: Number(e.target.value),
                                    }))
                                  }
                                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                                >
                                  {DAY_NAMES.map((d, i) => (
                                    <option key={i} value={i}>
                                      {d}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                                  Order
                                </label>
                                <input
                                  type="number"
                                  value={editForm.order}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      order: Number(e.target.value),
                                    }))
                                  }
                                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                                />
                              </div>
                            </div>
                            <div className="mt-3">
                              <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                                Description
                              </label>
                              <textarea
                                value={editForm.description}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    description: e.target.value,
                                  }))
                                }
                                rows={2}
                                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                              />
                            </div>
                            <div className="mt-3">
                              <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                                Video URL
                              </label>
                              <input
                                type="text"
                                value={editForm.embeddedVideoUrl}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    embeddedVideoUrl: e.target.value,
                                  }))
                                }
                                placeholder="https://..."
                                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                              />
                            </div>
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={() => handleEdit(tmpl._id)}
                                disabled={submitting}
                                className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[var(--color-bg-dark)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="rounded-[var(--radius-md)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Template row */
                          <div
                            key={tmpl._id}
                            className={`flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 ${
                              !tmpl.isActive ? "opacity-50" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="shrink-0 rounded bg-[var(--color-accent)] px-2 py-0.5 text-xs font-medium text-[var(--color-bg-dark)]">
                                {DAY_NAMES[tmpl.dayOfWeek]}
                              </span>
                              <span className="shrink-0 rounded bg-[var(--color-bg-card)] px-2 py-0.5 text-xs font-medium text-white">
                                {typeLabel(tmpl.type)}
                              </span>
                              <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                                {tmpl.title}
                              </span>
                              {tmpl.description && (
                                <span className="hidden truncate text-xs text-[var(--color-text-muted)] lg:inline">
                                  {tmpl.description}
                                </span>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2 ml-3">
                              {/* Active toggle */}
                              <button
                                onClick={() =>
                                  handleToggleActive(tmpl._id, tmpl.isActive)
                                }
                                title={tmpl.isActive ? "Deactivate" : "Activate"}
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  tmpl.isActive
                                    ? "bg-emerald-600 text-white"
                                    : "bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border)]"
                                }`}
                              >
                                {tmpl.isActive ? "Active" : "Inactive"}
                              </button>
                              {/* Edit */}
                              <button
                                onClick={() => startEdit(tmpl)}
                                className="rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text-primary)]"
                                title="Edit"
                              >
                                <svg
                                  className="h-3.5 w-3.5"
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
                              {/* Delete */}
                              <button
                                onClick={() => handleDelete(tmpl._id)}
                                className="rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-muted)] hover:bg-red-500/20 hover:text-red-400"
                                title="Delete"
                              >
                                <svg
                                  className="h-3.5 w-3.5"
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
                        )
                      )}
                    </div>
                  )}

                  {/* Add template form */}
                  {addingForWeek === week ? (
                    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-accent)] bg-[var(--color-bg-secondary)] p-3">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                            Title
                          </label>
                          <input
                            type="text"
                            value={newForm.title}
                            onChange={(e) =>
                              setNewForm((f) => ({
                                ...f,
                                title: e.target.value,
                              }))
                            }
                            placeholder="Task title"
                            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                            Type
                          </label>
                          <select
                            value={newForm.type}
                            onChange={(e) =>
                              setNewForm((f) => ({
                                ...f,
                                type: e.target.value,
                              }))
                            }
                            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                          >
                            {TASK_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                            Day
                          </label>
                          <select
                            value={newForm.dayOfWeek}
                            onChange={(e) =>
                              setNewForm((f) => ({
                                ...f,
                                dayOfWeek: Number(e.target.value),
                              }))
                            }
                            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                          >
                            {DAY_NAMES.map((d, i) => (
                              <option key={i} value={i}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                            Order
                          </label>
                          <input
                            type="number"
                            value={newForm.order}
                            onChange={(e) =>
                              setNewForm((f) => ({
                                ...f,
                                order: Number(e.target.value),
                              }))
                            }
                            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                          />
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                          Description
                        </label>
                        <textarea
                          value={newForm.description}
                          onChange={(e) =>
                            setNewForm((f) => ({
                              ...f,
                              description: e.target.value,
                            }))
                          }
                          rows={2}
                          placeholder="Optional description"
                          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                        />
                      </div>
                      <div className="mt-3">
                        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
                          Video URL
                        </label>
                        <input
                          type="text"
                          value={newForm.embeddedVideoUrl}
                          onChange={(e) =>
                            setNewForm((f) => ({
                              ...f,
                              embeddedVideoUrl: e.target.value,
                            }))
                          }
                          placeholder="https://..."
                          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                        />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleAdd(week)}
                          disabled={submitting || !newForm.title.trim()}
                          className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[var(--color-bg-dark)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                        >
                          Add Template
                        </button>
                        <button
                          onClick={() => {
                            setAddingForWeek(null);
                            setNewForm(emptyForm);
                          }}
                          className="rounded-[var(--radius-md)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAddingForWeek(week);
                        setNewForm(emptyForm);
                        if (!expandedWeeks.has(week)) toggleWeek(week);
                      }}
                      className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
                    >
                      <svg
                        className="h-3.5 w-3.5"
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
                      Add Template
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageWrapper>
  );
}
