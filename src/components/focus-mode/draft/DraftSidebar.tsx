'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { INote, IComment } from '@/models/ContentIdea';
import type { ISavedTag } from '@/models/UserTagLibrary';
import VoiceInputWrapper from '@/components/VoiceInputWrapper';

const TAG_COLORS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
];

interface DraftSidebarProps {
  priority: string;
  onPriorityChange: (v: string) => void;
  callToAction: string;
  setCallToAction: (v: string) => void;
  onSaveCallToAction?: (v: string) => void;
  tags: string[];
  setTags: (v: string[]) => void;
  alternativeTitles: string[];
  notes: INote[];
  setNotes: (v: INote[]) => void;
  comments: IComment[];
  onMarkChanged: () => void;
  onSwapTitle?: (altTitle: string) => void;
  onRegenerateTitles?: () => void;
  isRegeneratingTitles?: boolean;
  onAddComment?: (text: string) => void;
}

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High', bg: 'var(--color-error)', text: '#FFFFFF' },
  { value: 'medium', label: 'Medium', bg: 'var(--color-accent)', text: '#FFFFFF' },
  { value: 'low', label: 'Low', bg: 'var(--color-bg-elevated)', text: 'var(--color-text-primary)' },
  { value: 'none', label: 'None', bg: 'var(--color-bg-secondary)', text: 'var(--color-text-secondary)' },
];

interface PanelConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const PANELS: PanelConfig[] = [
  {
    id: 'priority',
    label: 'Priority',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
      </svg>
    ),
  },
  {
    id: 'cta',
    label: 'Call to action',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="#E05A47" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
      </svg>
    ),
  },
  {
    id: 'tags',
    label: 'Tags',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
      </svg>
    ),
  },
  {
    id: 'alt-titles',
    label: 'Alternative Titles',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#3B82F6">
        <text x="4" y="18" fontSize="18" fontWeight="700" fontFamily="system-ui">T</text>
      </svg>
    ),
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    id: 'comments',
    label: 'Comments',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
      </svg>
    ),
  },
];

export default function DraftSidebar({
  priority,
  onPriorityChange,
  callToAction,
  setCallToAction,
  onSaveCallToAction,
  tags,
  setTags,
  alternativeTitles,
  notes,
  setNotes,
  comments,
  onMarkChanged,
  onSwapTitle,
  onRegenerateTitles,
  isRegeneratingTitles,
  onAddComment,
}: DraftSidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ cta: true, 'alt-titles': true });
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [savedTags, setSavedTags] = useState<ISavedTag[]>([]);
  const [colorPickerTag, setColorPickerTag] = useState<string | null>(null);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [noteInput, setNoteInput] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  // Fetch saved tag library on mount
  useEffect(() => {
    fetch('/api/tags')
      .then((res) => res.json())
      .then((data) => {
        if (data.tags) setSavedTags(data.tags);
      })
      .catch(() => {});
  }, []);

  // Close color picker on outside click
  useEffect(() => {
    if (!colorPickerTag) return;
    const handleClick = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setColorPickerTag(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [colorPickerTag]);

  const getSavedTagColor = useCallback(
    (tagName: string): string | null => {
      const found = savedTags.find((t) => t.name === tagName.toLowerCase());
      return found ? found.color : null;
    },
    [savedTags]
  );

  const handleSaveTagToLibrary = useCallback(
    async (tagName: string, color: string) => {
      try {
        const res = await fetch('/api/tags', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: tagName, color }),
        });
        const data = await res.json();
        if (data.tags) setSavedTags(data.tags);
      } catch {
        // silently fail
      }
      setColorPickerTag(null);
    },
    []
  );

  const togglePanel = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleAddTag = useCallback((name?: string) => {
    const trimmed = (name || tagInput).trim();
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

  const handleAddComment = useCallback(() => {
    const trimmed = commentInput.trim();
    if (trimmed && onAddComment) {
      onAddComment(trimmed);
      setCommentInput('');
    }
  }, [commentInput, onAddComment]);

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
      {PANELS.map((panel) => {
        const alwaysOpen = panel.id === 'priority' || panel.id === 'cta' || panel.id === 'alt-titles';
        const isOpen = alwaysOpen || expanded[panel.id];
        return (
        <div
          key={panel.id}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden"
        >
          {/* Panel header */}
          {alwaysOpen ? (
            <div className="flex w-full items-center px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0">
                  {panel.icon}
                </span>
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {panel.label}
                </span>
              </div>
              {panel.id === 'alt-titles' && onRegenerateTitles && (
                <button
                  onClick={onRegenerateTitles}
                  disabled={isRegeneratingTitles}
                  className="ml-auto flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
                >
                  {isRegeneratingTitles ? (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
                    </svg>
                  )}
                  {isRegeneratingTitles ? 'Generating...' : 'Regenerate'}
                </button>
              )}
            </div>
          ) : (
          <button
            onClick={() => togglePanel(panel.id)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0">
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
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setShowNoteInput(true); setExpanded((prev) => ({ ...prev, notes: true })); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setShowNoteInput(true); setExpanded((prev) => ({ ...prev, notes: true })); } }}
                  className="text-xs text-[var(--color-accent)] hover:underline cursor-pointer"
                >
                  + Add
                </span>
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
          )}

          {/* Panel content */}
          {isOpen && (
            <div className="border-t border-[var(--color-border)] px-4 py-3">
              {panel.id === 'priority' && (
                <div className="flex flex-wrap gap-1.5">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onPriorityChange(opt.value)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        priority === opt.value
                          ? 'ring-2 ring-[var(--color-accent)] ring-offset-1 ring-offset-[var(--color-bg-card)]'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: opt.bg, color: opt.text }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {panel.id === 'cta' && (
                <div className="space-y-2">
                  <VoiceInputWrapper onTranscript={(text) => { setCallToAction(callToAction ? callToAction + '\n' + text : text); onMarkChanged(); }}>
                    <textarea
                      value={callToAction}
                      onChange={(e) => { setCallToAction(e.target.value); onMarkChanged(); }}
                      placeholder="What should viewers do next?"
                      rows={3}
                      className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none ring-0"
                    />
                  </VoiceInputWrapper>
                  <button
                    onClick={() => { onSaveCallToAction?.(callToAction); }}
                    className="rounded-md border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)] transition-colors"
                  >
                    Save changes
                  </button>
                </div>
              )}

              {panel.id === 'tags' && (
                <div>
                  {/* Existing tags */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map((tag) => {
                      const savedColor = getSavedTagColor(tag);
                      const isSaved = !!savedColor;
                      return (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs relative"
                          style={
                            isSaved
                              ? { backgroundColor: savedColor, color: '#FFFFFF' }
                              : { backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text)' }
                          }
                        >
                          {tag}
                          {/* Save to library button for unsaved tags */}
                          {!isSaved && (
                            <button
                              onClick={(e) => {
                                if (colorPickerTag === tag) {
                                  setColorPickerTag(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setPickerPos({ top: rect.bottom + 4, left: rect.left });
                                  setColorPickerTag(tag);
                                }
                              }}
                              className="ml-0.5 hover:opacity-80"
                              title="Save to tag library"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:opacity-80"
                            style={{ color: isSaved ? 'rgba(255,255,255,0.7)' : 'var(--color-text-secondary)' }}
                          >
                            &times;
                          </button>
                          {/* Color picker rendered via portal to escape overflow clipping */}
                        </span>
                      );
                    })}
                  </div>

                  {/* Tag input with suggestions */}
                  {showTagInput ? (
                    <div className="relative">
                      <input
                        data-transparent=""
                        style={{ backgroundColor: 'transparent' }}
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                            setShowTagInput(false);
                          }
                          if (e.key === 'Escape') setShowTagInput(false);
                        }}
                        onBlur={(e) => {
                          // Delay to allow clicking suggestions
                          const relatedTarget = e.relatedTarget as HTMLElement | null;
                          if (relatedTarget?.closest('[data-tag-suggestions]')) return;
                          setTimeout(() => {
                            if (!tagInput.trim()) setShowTagInput(false);
                          }, 150);
                        }}
                        placeholder="Type to add new tag..."
                        className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none ring-0"
                        autoFocus
                      />
                      {/* Unselected saved tags shown below input for quick one-click adding */}
                      {(() => {
                        const query = tagInput.trim().toLowerCase();
                        const availableTags = savedTags.filter(
                          (st) =>
                            !tags.some((t) => t.toLowerCase() === st.name) &&
                            (!query || st.name.includes(query))
                        );
                        if (availableTags.length === 0) return null;
                        return (
                          <div
                            data-tag-suggestions=""
                            className="mt-1.5 flex flex-wrap gap-1.5"
                          >
                            {availableTags.map((st) => (
                              <button
                                key={st.name}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  handleAddTag(st.name);
                                  setShowTagInput(false);
                                }}
                                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs transition-opacity hover:opacity-80"
                                style={{ backgroundColor: st.color, color: '#FFFFFF' }}
                              >
                                {st.name}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowTagInput(true)}
                      className="text-xs text-[var(--color-accent)] hover:underline"
                    >
                      + Add tag
                    </button>
                  )}
                  {/* Color picker portal */}
                  {colorPickerTag && typeof document !== 'undefined' && createPortal(
                    <div
                      ref={colorPickerRef}
                      className="rounded-lg border border-[var(--color-border)] p-2 shadow-lg"
                      style={{
                        position: 'fixed',
                        top: pickerPos.top,
                        left: pickerPos.left,
                        zIndex: 9999,
                        backgroundColor: 'var(--color-bg-card)',
                      }}
                    >
                      <p className="text-[10px] mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                        Pick a color
                      </p>
                      <div className="flex gap-1.5">
                        {TAG_COLORS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => handleSaveTagToLibrary(colorPickerTag, c.value)}
                            className="h-5 w-5 rounded-full border border-[var(--color-border)] hover:scale-110 transition-transform"
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              )}

              {panel.id === 'alt-titles' && (
                <div className="space-y-2">
                  {alternativeTitles.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)]">No alternative titles yet.</p>
                  ) : (
                    alternativeTitles.map((t, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <p className="text-sm text-[var(--color-text)] flex-1">{t}</p>
                        {onSwapTitle && (
                          <button
                            onClick={() => onSwapTitle(t)}
                            className="shrink-0 rounded-md border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)] transition-colors"
                          >
                            Swap Title
                          </button>
                        )}
                      </div>
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
                        data-transparent=""
                        style={{ backgroundColor: 'transparent' }}
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
                    <p className="text-center text-xs text-[var(--color-text-muted)] whitespace-pre-line">
                      {"No notes yet.\nAdd a custom note or connect a sticky note."}
                    </p>
                  )}
                </div>
              )}

              {panel.id === 'comments' && (
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)]">No comments yet.</p>
                  ) : (
                    comments.map((c, i) => {
                      const avatarColors = ['#E05A47', '#3B82F6', '#22C55E', '#F59E0B', '#6366F1', '#EC4899'];
                      const color = avatarColors[i % avatarColors.length];
                      const initial = c.text?.charAt(0)?.toUpperCase() || 'C';
                      return (
                        <div key={i} className="flex items-start gap-2">
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: color }}
                          >
                            {initial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-[var(--color-text-muted)] mb-1">
                              Coach · {formatRelativeTime(c.createdAt) || '2 days ago'}
                            </p>
                            <div className="rounded-lg bg-[var(--color-bg-secondary)] p-3">
                              <p className="text-sm text-[var(--color-text)]">{c.text}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Comment input area */}
                  <div className="space-y-2 pt-1">
                    <VoiceInputWrapper onTranscript={(text) => setCommentInput((prev) => prev ? prev + '\n' + text : text)}>
                      <textarea
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                            e.preventDefault();
                            handleAddComment();
                          }
                        }}
                        placeholder="Leave a comment... type @ to tag someone"
                        rows={2}
                        className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none ring-0"
                      />
                    </VoiceInputWrapper>
                    <div className="flex items-center justify-between">
                      <button className="text-xs text-[var(--color-accent)] hover:underline">
                        @ Mention
                      </button>
                      <button
                        onClick={handleAddComment}
                        disabled={!commentInput.trim()}
                        className="flex items-center gap-1 rounded-md bg-[var(--color-accent)] px-3 py-1 text-xs text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                        </svg>
                        Send
                      </button>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      Cmd+Enter to send · @ to mention
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
      })}
    </div>
  );
}
