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
  onSwapTitle?: (altTitle: string) => void;
  onRegenerateTitles?: () => void;
  onAddComment?: (text: string) => void;
}

interface PanelConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const PANELS: PanelConfig[] = [
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
  callToAction,
  setCallToAction,
  tags,
  setTags,
  alternativeTitles,
  notes,
  setNotes,
  comments,
  onMarkChanged,
  onSwapTitle,
  onRegenerateTitles,
  onAddComment,
}: DraftSidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ cta: true });
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [commentInput, setCommentInput] = useState('');

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
                <div className="space-y-2">
                  <textarea
                    value={callToAction}
                    onChange={(e) => { setCallToAction(e.target.value); onMarkChanged(); }}
                    placeholder="What should viewers do next?"
                    rows={3}
                    className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none ring-0"
                  />
                  <button
                    onClick={onMarkChanged}
                    className="rounded-md border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)] transition-colors"
                  >
                    Save changes
                  </button>
                </div>
              )}

              {panel.id === 'tags' && (
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)] px-2.5 py-0.5 text-xs text-white"
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
                  {showTagInput ? (
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); setShowTagInput(false); } if (e.key === 'Escape') setShowTagInput(false); }}
                      onBlur={() => { if (!tagInput.trim()) setShowTagInput(false); }}
                      placeholder="Type + Enter to add"
                      className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none ring-0"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setShowTagInput(true)}
                      className="text-xs text-[var(--color-accent)] hover:underline"
                    >
                      + Add tag
                    </button>
                  )}
                </div>
              )}

              {panel.id === 'alt-titles' && (
                <div className="space-y-2">
                  {onRegenerateTitles && (
                    <button
                      onClick={onRegenerateTitles}
                      className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors mb-1"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
                      </svg>
                      Regenerate
                    </button>
                  )}
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
      ))}
    </div>
  );
}
