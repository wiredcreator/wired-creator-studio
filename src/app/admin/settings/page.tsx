"use client";

import { useState, useEffect } from "react";
import PageWrapper from "@/components/PageWrapper";
import { useTimezone } from "@/hooks/useTimezone";

interface XPConfigData {
  taskCompleted: number;
  newIdeaSaved: number;
  newScriptCreated: number;
  newBrainDump: number;
  sideQuestMin: number;
  sideQuestMax: number;
  voiceStorm: number;
  updatedAt?: string;
}

const XP_FIELDS: {
  key: keyof Omit<XPConfigData, "updatedAt">;
  label: string;
  description: string;
}[] = [
  {
    key: "taskCompleted",
    label: "Task Completed",
    description: "XP awarded when a student completes any task",
  },
  {
    key: "newIdeaSaved",
    label: "New Idea Saved",
    description: "XP awarded when a student saves a new content idea",
  },
  {
    key: "newScriptCreated",
    label: "New Script Created",
    description: "XP awarded when a student creates a new script",
  },
  {
    key: "newBrainDump",
    label: "New Brain Dump",
    description: "XP awarded when a student submits a brain dump",
  },
  {
    key: "voiceStorm",
    label: "Voice Storm",
    description: "XP awarded when a student completes a voice storming session",
  },
  {
    key: "sideQuestMin",
    label: "Side Quest Min XP",
    description: "Minimum XP the AI can assign to a side quest",
  },
  {
    key: "sideQuestMax",
    label: "Side Quest Max XP",
    description: "Maximum XP the AI can assign to a side quest",
  },
];

export default function AdminSettingsPage() {
  const { formatDateTime } = useTimezone();
  const [config, setConfig] = useState<XPConfigData | null>(null);
  const [draft, setDraft] = useState<XPConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/xp-config");
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
          setDraft(data);
        }
      } catch (err) {
        console.error("Error fetching XP config:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const hasChanges =
    draft && config
      ? XP_FIELDS.some((f) => draft[f.key] !== config[f.key])
      : false;

  async function handleSave() {
    if (!draft) return;

    // Client-side validation
    if (draft.sideQuestMin > draft.sideQuestMax) {
      setMessage({
        type: "error",
        text: "Side Quest Min cannot be greater than Side Quest Max.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/xp-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setDraft(data);
        setMessage({ type: "success", text: "XP values saved successfully." });
      } else {
        const err = await res.json();
        setMessage({
          type: "error",
          text: err.error || "Failed to save XP config.",
        });
      }
    } catch (err) {
      console.error("Error saving XP config:", err);
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (config) {
      setDraft({ ...config });
      setMessage(null);
    }
  }

  return (
    <PageWrapper title="Settings" subtitle="Configure platform settings.">
      <div className="space-y-6 max-w-2xl">
        {/* XP Configuration Card */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-sm)]">
          <div className="border-b border-[var(--color-border)] px-6 py-4">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              XP Point Values
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Configure how many experience points students earn for each
              action. Side quest XP is assigned by the AI within the min/max
              range.
            </p>
          </div>

          <div className="px-6 py-5">
            {loading && (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)]"
                  />
                ))}
              </div>
            )}

            {!loading && draft && (
              <div className="space-y-5">
                {XP_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-start gap-4">
                    <div className="flex-1 min-w-0 pt-1.5">
                      <label
                        htmlFor={field.key}
                        className="block text-sm font-medium text-[var(--color-text-primary)]"
                      >
                        {field.label}
                      </label>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {field.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <input
                        id={field.key}
                        type="number"
                        min={0}
                        max={1000}
                        value={draft[field.key]}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setDraft((prev) =>
                            prev
                              ? { ...prev, [field.key]: isNaN(val) ? 0 : val }
                              : prev
                          );
                        }}
                        className="w-20 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] text-center outline-none ring-0"
                      />
                      <span className="text-xs text-[var(--color-text-muted)] w-6">
                        XP
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with save/reset */}
          {!loading && draft && (
            <div className="border-t border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
              <div>
                {message && (
                  <p
                    className={`text-sm ${
                      message.type === "success"
                        ? "text-[var(--color-success,#22c55e)]"
                        : "text-[var(--color-error,#ef4444)]"
                    }`}
                  >
                    {message.text}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {hasChanges && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Last updated info */}
        {config?.updatedAt && (
          <p className="text-xs text-[var(--color-text-muted)]">
            Last updated:{" "}
            {formatDateTime(config.updatedAt, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </PageWrapper>
  );
}
