'use client';

import { useState, useCallback } from 'react';
import type { INote, IComment } from '@/models/ContentIdea';

interface DraftSidebarProps {
  callToAction: string;
  setCallToAction: (v: string) => void;
  tags: string[];
  setTags: (v: string[]) => void;
  alternativeTitles: string[];
  notes: INote[];
  setNotes: (v: INote[]) => void;
  comments: IComment[];
  onMarkChanged: () => void;
}

interface PanelConfig {
  id: string;
  label: string;
  icon: string;
  iconColor: string;
}

const PANELS: PanelConfig[] = [
  { id: 'cta', label: 'Call to action', icon: '\u2728', iconColor: '#E05A47' },
  { id: 'tags', label: 'Tags', icon: '\uD83C\uDFF7\uFE0F', iconColor: '#22C55E' },
  { id: 'alt-titles', label: 'Alternative Titles', icon: 'T', iconColor: '#3B82F6' },
  { id: 'notes', label: 'Notes', icon: '\uD83D\uDCDD', iconColor: '#F59E0B' },
  { id: 'comments', label: 'Comments', icon: '\uD83D\uDCAC', iconColor: '#6366F1' },
];

export default function DraftSidebar({
  callToAction,
  setCallToAction,
  tags,
  setTags,
  alternativeTitles,
  notes,
  setNotes,
  comments,
  onMarkChanged,
}: DraftSidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ cta: true });
  const [tagInput, setTagInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const togglePanel = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      onMarkChanged();
    }
    setTagInput('');
  }, [tagInput, tags, setTags, onMarkChanged]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags(tags.filter((t) => t !== tag));
    onMarkChanged();
  }, [tags, setTags, onMarkChanged]);

  const handleAddNote = useCallback(() => {
    const trimmed = noteInput.trim();
    if (trimmed) {
      setNotes([...notes, { text: trimmed, createdAt: new Date() }]);
      onMarkChanged();
      setNoteInput('');
      setShowNoteInput(false);
    }
  }, [noteInput, notes, setNotes, onMarkChanged]);

  const formatRelativeTime = (date?: Date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-3">
      {PANELS.map((panel) => (
        <div
          key={panel.id}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden"
        >
          {/* Panel header */}
          <button
            onClick={() => togglePanel(panel.id)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--color-hover)]"
          >
            <div className="flex items-center gap-2">
              <span style={{ color: panel.iconColor }} className="text-sm">
                {panel.icon}
              </span>
              <span className="text-sm font-medium text-[var(--color-text)]">
                {panel.label}
              </span>
              {panel.id === 'comments' && comments.length > 0 && (
                <span className="ml-1 rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {comments.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {panel.id === 'notes' && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowNoteInput(true); setExpanded((prev) => ({ ...prev, notes: true })); }}
                  className="text-xs text-[var(--color-accent)] hover:underline"
                >
                  + Add
                </button>
              )}
              <svg
                className={`h-4 w-4 text-[var(--color-text-muted)] transition-transform ${expanded[panel.id] ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </button>

          {/* Panel content */}
          {expanded[panel.id] && (
            <div className="border-t border-[var(--color-border)] px-4 py-3">
              {panel.id === 'cta' && (
                <input
                  type="text"
                  value={callToAction}
                  onChange={(e) => { setCallToAction(e.target.value); onMarkChanged(); }}
                  placeholder="e.g. Subscribe for more..."
                  className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none ring-0"
                />
              )}

              {panel.id === 'tags' && (
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--color-bg-secondary)] px-2.5 py-0.5 text-xs text-white"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                    placeholder="Type + Enter to add"
                    className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none ring-0"
                  />
                </div>
              )}

              {panel.id === 'alt-titles' && (
                <div className="space-y-2">
                  {alternativeTitles.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)]">No alternative titles yet.</p>
                  ) : (
                    alternativeTitles.map((t, i) => (
                      <p key={i} className="text-sm text-[var(--color-text)]">{t}</p>
                    ))
                  )}
                </div>
              )}

              {panel.id === 'notes' && (
                <div className="space-y-2">
                  {notes.map((note, i) => (
                    <div key={i} className="text-sm">
                      <p className="text-[var(--color-text)]">{note.text}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">{formatRelativeTime(note.createdAt)}</p>
                    </div>
                  ))}
                  {showNoteInput && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNote(); } }}
                        placeholder="Add a note..."
                        className="flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none ring-0"
                        autoFocus
                      />
                      <button onClick={handleAddNote} className="text-xs text-[var(--color-accent)]">Add</button>
                    </div>
                  )}
                  {notes.length === 0 && !showNoteInput && (
                    <p className="text-xs text-[var(--color-text-muted)]">No notes yet.</p>
                  )}
                </div>
              )}

              {panel.id === 'comments' && (
                <div className="space-y-2">
                  {comments.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)]">No comments yet.</p>
                  ) : (
                    comments.map((c, i) => (
                      <div key={i} className="text-sm">
                        <p className="text-[var(--color-text)]">{c.text}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{formatRelativeTime(c.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
