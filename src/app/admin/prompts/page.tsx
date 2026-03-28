"use client";

import { useState, useEffect, useCallback } from "react";
import PageWrapper from "@/components/PageWrapper";

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

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [PromptCategory, string][];

interface PromptFormData {
  name: string;
  category: PromptCategory;
  promptText: string;
  isActive: boolean;
}

const defaultFormData: PromptFormData = {
  name: "",
  category: "script_generation",
  promptText: "",
  isActive: true,
};

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [formData, setFormData] = useState<PromptFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/prompts");
      if (res.ok) {
        const data = await res.json();
        setPrompts(data);
      }
    } catch (err) {
      console.error("Error fetching prompts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  function openCreateModal() {
    setEditingPrompt(null);
    setFormData(defaultFormData);
    setModalOpen(true);
  }

  function openEditModal(prompt: CustomPrompt) {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      category: prompt.category as PromptCategory,
      promptText: prompt.promptText,
      isActive: prompt.isActive,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingPrompt(null);
    setFormData(defaultFormData);
  }

  async function handleSave() {
    if (!formData.name.trim() || !formData.promptText.trim()) return;

    setSaving(true);
    try {
      if (editingPrompt) {
        const res = await fetch(`/api/admin/prompts/${editingPrompt._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          const updated = await res.json();
          setPrompts((prev) =>
            prev.map((p) => (p._id === updated._id ? updated : p))
          );
          closeModal();
        }
      } else {
        const res = await fetch("/api/admin/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          const created = await res.json();
          setPrompts((prev) => [created, ...prev]);
          closeModal();
        }
      }
    } catch (err) {
      console.error("Error saving prompt:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(prompt: CustomPrompt) {
    setTogglingId(prompt._id);
    try {
      const res = await fetch(`/api/admin/prompts/${prompt._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !prompt.isActive }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPrompts((prev) =>
          prev.map((p) => (p._id === updated._id ? updated : p))
        );
      }
    } catch (err) {
      console.error("Error toggling prompt:", err);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(promptId: string) {
    if (!confirm("Are you sure you want to delete this prompt?")) return;

    setDeletingId(promptId);
    try {
      const res = await fetch(`/api/admin/prompts/${promptId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPrompts((prev) => prev.filter((p) => p._id !== promptId));
      }
    } catch (err) {
      console.error("Error deleting prompt:", err);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <PageWrapper
      title="AI Prompts"
      subtitle="Create and manage custom prompts used by AI-powered features like script generation, idea generation, and more."
    >
      <div className="space-y-6">
        {/* Header with New Prompt button */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-muted)]">
            {loading ? "--" : `${prompts.length} prompt${prompts.length !== 1 ? "s" : ""}`}
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ outline: "none" }}
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
            New Prompt
          </button>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)]"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && prompts.length === 0 && (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
            <svg
              className="mx-auto h-10 w-10 text-[var(--color-text-muted)]"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              No custom prompts yet. Click &ldquo;New Prompt&rdquo; to create one.
            </p>
          </div>
        )}

        {/* Prompt list */}
        {!loading && prompts.length > 0 && (
          <div className="space-y-3">
            {prompts.map((prompt) => (
              <div
                key={prompt._id}
                className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                        {prompt.name}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-[var(--radius-full)] px-2 py-0.5 text-xs font-medium ${
                          prompt.isActive
                            ? "bg-green-500/20 text-green-400"
                            : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"
                        }`}
                      >
                        {prompt.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <span className="mt-1 inline-block rounded-[var(--radius-full)] bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-white">
                      {CATEGORY_LABELS[prompt.category as PromptCategory] || prompt.category}
                    </span>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)] line-clamp-2">
                      {prompt.promptText}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    {/* Toggle active */}
                    <button
                      onClick={() => handleToggleActive(prompt)}
                      disabled={togglingId === prompt._id}
                      className="rounded-[var(--radius-md)] p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
                      style={{ outline: "none" }}
                      title={prompt.isActive ? "Deactivate" : "Activate"}
                    >
                      {prompt.isActive ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEditModal(prompt)}
                      className="rounded-[var(--radius-md)] p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                      style={{ outline: "none" }}
                      title="Edit"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(prompt._id)}
                      disabled={deletingId === prompt._id}
                      className="rounded-[var(--radius-md)] p-2 text-[var(--color-text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                      style={{ outline: "none" }}
                      title="Delete"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-[var(--shadow-lg)]">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {editingPrompt ? "Edit Prompt" : "New Prompt"}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {editingPrompt
                ? "Update the prompt details below."
                : "Create a new custom prompt for an AI feature."}
            </p>

            <div className="mt-6 space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Friendly Script Tone"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none ring-0"
                />
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value as PromptCategory,
                    }))
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none ring-0"
                >
                  {CATEGORY_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prompt Text */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                  Prompt Text
                </label>
                <textarea
                  value={formData.promptText}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      promptText: e.target.value,
                    }))
                  }
                  rows={6}
                  placeholder="Enter the prompt instructions..."
                  className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm leading-relaxed text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none ring-0"
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    Active
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Inactive prompts won&apos;t be used by AI features.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      isActive: !prev.isActive,
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    formData.isActive
                      ? "bg-[var(--color-accent)]"
                      : "bg-[var(--color-bg-tertiary)]"
                  }`}
                  style={{ outline: "none" }}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      formData.isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Modal actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-opacity hover:opacity-80"
                style={{ outline: "none" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name.trim() || !formData.promptText.trim()}
                className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ outline: "none" }}
              >
                {saving
                  ? "Saving..."
                  : editingPrompt
                    ? "Update Prompt"
                    : "Create Prompt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
