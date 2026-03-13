'use client';

import { useState, useCallback } from 'react';
import type {
  ToneOfVoiceParameter,
  ToneParameterCategory,
} from '@/types/ai';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GuideStatus = 'draft' | 'review' | 'active';

interface ToneOfVoiceEditorProps {
  /** Initial parameters to display. */
  initialParameters: ToneOfVoiceParameter[];
  /** Initial summary text. */
  initialSummary: string;
  /** Current status of the guide. */
  status: GuideStatus;
  /** Called when the user saves edits. */
  onSave?: (params: ToneOfVoiceParameter[], summary: string) => void;
  /** Called when the user clicks Regenerate. */
  onRegenerate?: () => void;
  /** Called when the status badge is changed. */
  onStatusChange?: (status: GuideStatus) => void;
  /** Whether a regeneration is currently in progress. */
  isRegenerating?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: { key: ToneParameterCategory; label: string }[] = [
  { key: 'vocabulary', label: 'Vocabulary' },
  { key: 'sentence_structure', label: 'Sentence Structure' },
  { key: 'emotional_tone', label: 'Emotional Tone' },
  { key: 'rhetorical_patterns', label: 'Rhetorical Patterns' },
  { key: 'phrases_to_avoid', label: 'Phrases to Avoid' },
  { key: 'personality_markers', label: 'Personality Markers' },
];

const STATUS_CONFIG: Record<
  GuideStatus,
  { label: string; bg: string; text: string }
> = {
  draft: { label: 'Draft', bg: 'bg-amber-100', text: 'text-amber-800' },
  review: { label: 'In Review', bg: 'bg-blue-100', text: 'text-blue-800' },
  active: { label: 'Active', bg: 'bg-emerald-100', text: 'text-emerald-800' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ToneOfVoiceEditor({
  initialParameters,
  initialSummary,
  status,
  onSave,
  onRegenerate,
  onStatusChange,
  isRegenerating = false,
}: ToneOfVoiceEditorProps) {
  const [parameters, setParameters] =
    useState<ToneOfVoiceParameter[]>(initialParameters);
  const [summary, setSummary] = useState(initialSummary);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editKey, setEditKey] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategory, setNewCategory] =
    useState<ToneParameterCategory>('vocabulary');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [currentStatus, setCurrentStatus] = useState<GuideStatus>(status);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // --- Inline Edit ---

  const startEditing = useCallback(
    (index: number) => {
      setEditingIndex(index);
      setEditKey(parameters[index].key);
      setEditValue(parameters[index].value);
    },
    [parameters]
  );

  const saveEdit = useCallback(() => {
    if (editingIndex === null) return;
    setParameters((prev) => {
      const updated = [...prev];
      updated[editingIndex] = {
        ...updated[editingIndex],
        key: editKey.trim() || updated[editingIndex].key,
        value: editValue.trim() || updated[editingIndex].value,
      };
      return updated;
    });
    setEditingIndex(null);
    setHasUnsavedChanges(true);
  }, [editingIndex, editKey, editValue]);

  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
  }, []);

  // --- Delete ---

  const deleteParameter = useCallback((index: number) => {
    setParameters((prev) => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  }, []);

  // --- Add New ---

  const addParameter = useCallback(() => {
    if (!newKey.trim() || !newValue.trim()) return;
    setParameters((prev) => [
      ...prev,
      {
        key: newKey.trim(),
        value: newValue.trim(),
        category: newCategory,
      },
    ]);
    setNewKey('');
    setNewValue('');
    setIsAddingNew(false);
    setHasUnsavedChanges(true);
  }, [newKey, newValue, newCategory]);

  // --- Status ---

  const cycleStatus = useCallback(() => {
    const order: GuideStatus[] = ['draft', 'review', 'active'];
    const next = order[(order.indexOf(currentStatus) + 1) % order.length];
    setCurrentStatus(next);
    onStatusChange?.(next);
  }, [currentStatus, onStatusChange]);

  // --- Save ---

  const handleSave = useCallback(() => {
    onSave?.(parameters, summary);
    setHasUnsavedChanges(false);
  }, [parameters, summary, onSave]);

  // --- Group parameters by category ---

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    params: parameters
      .map((p, originalIndex) => ({ ...p, originalIndex }))
      .filter((p) => p.category === cat.key),
  }));

  // --- Render ---

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Tone of Voice Guide
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Your living document that defines how your content sounds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <button
            onClick={cycleStatus}
            className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[currentStatus].bg} ${STATUS_CONFIG[currentStatus].text} hover:opacity-80 transition-opacity`}
          >
            {STATUS_CONFIG[currentStatus].label}
          </button>

          {/* Regenerate */}
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRegenerating ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Regenerating...
              </span>
            ) : (
              'Regenerate'
            )}
          </button>

          {/* Save */}
          {hasUnsavedChanges && (
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Voice Summary
        </label>
        <textarea
          value={summary}
          onChange={(e) => {
            setSummary(e.target.value);
            setHasUnsavedChanges(true);
          }}
          rows={3}
          className="w-full bg-transparent text-gray-800 text-sm leading-relaxed resize-none focus:outline-none"
          placeholder="A brief summary of this creator's authentic voice..."
        />
      </div>

      {/* Parameters by Category */}
      <div className="space-y-6">
        {grouped.map((group) => (
          <div key={group.key}>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              {group.label}
            </h3>

            {group.params.length === 0 ? (
              <p className="text-sm text-gray-400 italic mb-3">
                No parameters in this category yet.
              </p>
            ) : (
              <div className="space-y-2">
                {group.params.map((param) => (
                  <div
                    key={param.originalIndex}
                    className="group flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-colors"
                  >
                    {editingIndex === param.originalIndex ? (
                      /* Editing mode */
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={editKey}
                          onChange={(e) => setEditKey(e.target.value)}
                          className="w-full px-2 py-1 text-sm font-medium text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                          placeholder="Parameter key"
                        />
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1 text-sm text-gray-700 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
                          placeholder="Parameter value"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            className="px-3 py-1 text-xs font-medium text-white bg-gray-900 rounded hover:bg-gray-800"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display mode */
                      <>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900">
                            {param.key.replace(/_/g, ' ')}
                          </span>
                          <p className="mt-0.5 text-sm text-gray-600 leading-relaxed">
                            {param.value}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditing(param.originalIndex)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                            title="Edit"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteParameter(param.originalIndex)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add New Parameter */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        {isAddingNew ? (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <h4 className="text-sm font-medium text-gray-700">
              Add New Parameter
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) =>
                    setNewCategory(e.target.value as ToneParameterCategory)
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Key</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="e.g. opening_style"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Value</label>
              <textarea
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                rows={2}
                placeholder="Specific, actionable guidance..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={addParameter}
                disabled={!newKey.trim() || !newValue.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Parameter
              </button>
              <button
                onClick={() => {
                  setIsAddingNew(false);
                  setNewKey('');
                  setNewValue('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors w-full justify-center"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add New Parameter
          </button>
        )}
      </div>
    </div>
  );
}
