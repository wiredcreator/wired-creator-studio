'use client';

import { useState, useCallback } from 'react';
import type { IResource } from '@/models/ContentIdea';

interface ResourcesTabProps {
  resources: IResource[];
  setResources: (v: IResource[]) => void;
  onFindSources: () => void;
  onMarkChanged: () => void;
}

export default function ResourcesTab({
  resources,
  setResources,
  onFindSources,
  onMarkChanged,
}: ResourcesTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const handleAdd = useCallback(() => {
    if (!newName.trim()) return;
    const resource: IResource = {
      type: 'text',
      name: newName.trim(),
      content: newContent.trim(),
      createdAt: new Date(),
    };
    setResources([...resources, resource]);
    onMarkChanged();
    setNewName('');
    setNewContent('');
    setShowAddForm(false);
  }, [newName, newContent, resources, setResources, onMarkChanged]);

  const handleDelete = useCallback((index: number) => {
    setResources(resources.filter((_, i) => i !== index));
    onMarkChanged();
  }, [resources, setResources, onMarkChanged]);

  if (resources.length === 0 && !showAddForm) {
    return (
      <div className="rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-secondary)]">
          <svg className="h-6 w-6 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-[var(--color-text)]">No resources yet</h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Add a voice storm, text note, file, or brain dump, or let AI find online sources for you.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            + Add resource
          </button>
          <button
            onClick={onFindSources}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-hover)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            Find online sources
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Resources</h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Reference material, notes and sources for this idea. {resources.length} item{resources.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onFindSources}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] transition-colors hover:bg-[var(--color-hover)]"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            Find online sources
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90"
          >
            + Add resource
          </button>
        </div>
      </div>

      {/* Resource list */}
      <div className="space-y-2">
        {resources.map((r, i) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3"
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                className="flex items-center gap-2 text-left"
              >
                <svg
                  className={`h-3.5 w-3.5 text-[var(--color-text-muted)] transition-transform ${expandedIdx === i ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
                <span className="text-sm font-medium text-[var(--color-text)]">{r.name}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{r.type}</span>
              </button>
              <button
                onClick={() => handleDelete(i)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
            {expandedIdx === i && r.content && (
              <p className="mt-2 text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{r.content}</p>
            )}
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Resource name"
            className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none ring-0"
            autoFocus
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Content or notes..."
            rows={4}
            className="w-full resize-y bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none ring-0"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white"
            >
              Save
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewName(''); setNewContent(''); }}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
