'use client';

import { useState } from 'react';

interface BrainDumpMessageProps {
  sessionId: string;
  transcript: string;
  extractedIdeas: { title: string; description: string }[];
  extractedStories: { summary: string; fullText: string }[];
  extractedThemes: string[];
  createdAt?: string;
  isNew?: boolean;
  onDelete?: () => void;
}

export default function BrainDumpMessage({
  sessionId,
  transcript,
  extractedIdeas,
  extractedStories,
  extractedThemes,
  createdAt,
  isNew,
  onDelete,
}: BrainDumpMessageProps) {
  const [isExpanded, setIsExpanded] = useState(!!isNew);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable state
  const [editIdeas, setEditIdeas] = useState(extractedIdeas);
  const [editStories, setEditStories] = useState(extractedStories);
  const [editThemes, setEditThemes] = useState(extractedThemes);

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Just now';

  const transcriptPreview =
    transcript.length > 200 ? transcript.slice(0, 200) + '...' : transcript;

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/brain-dump/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractedIdeas: editIdeas,
          extractedStories: editStories,
          extractedThemes: editThemes,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditIdeas(extractedIdeas);
    setEditStories(extractedStories);
    setEditThemes(extractedThemes);
    setIsEditing(false);
  };

  const updateIdea = (index: number, field: 'title' | 'description', value: string) => {
    setEditIdeas((prev) => prev.map((idea, i) => (i === index ? { ...idea, [field]: value } : idea)));
  };

  const updateStory = (index: number, field: 'summary' | 'fullText', value: string) => {
    setEditStories((prev) => prev.map((story, i) => (i === index ? { ...story, [field]: value } : story)));
  };

  const updateTheme = (index: number, value: string) => {
    setEditThemes((prev) => prev.map((theme, i) => (i === index ? value : theme)));
  };

  const hasResults = editIdeas.length > 0 || editStories.length > 0 || editThemes.length > 0;

  return (
    <div className={`space-y-3 ${isNew ? 'animate-fadeIn' : ''}`}>
      {/* User message bubble */}
      <div className="flex justify-end">
        <div className="max-w-[85%] space-y-1">
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)] px-4 py-3">
            <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">
              {isExpanded ? transcript : transcriptPreview}
            </p>
            {transcript.length > 200 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-1 text-xs text-[var(--color-accent)] hover:underline"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] text-right px-1">
            {formattedDate}
          </p>
        </div>
      </div>

      {/* AI response bubble */}
      {hasResults && (
        <div className="flex justify-start">
          <div className="max-w-[90%] w-full">
            <div className="rounded-[var(--radius-lg)] bg-[var(--color-bg-card)] border border-[var(--color-border)] px-5 py-4">
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                    <svg className="h-3.5 w-3.5 text-[var(--color-bg-dark)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    Extracted Knowledge
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {saveSuccess && (
                    <span className="text-xs text-[var(--color-success)]">Saved</span>
                  )}
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCancelEdit}
                        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="text-xs font-medium text-[var(--color-bg-dark)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] px-3 py-1 rounded-[var(--radius-md)] transition-colors disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                  {onDelete && (
                    <button
                      onClick={onDelete}
                      className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors ml-1"
                      title="Delete session"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Content Ideas */}
              {editIdeas.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2.5">
                    Content Ideas
                  </h4>
                  <div className="space-y-2.5">
                    {editIdeas.map((idea, i) => (
                      <div
                        key={i}
                        className="rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] p-3"
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={idea.title}
                              onChange={(e) => updateIdea(i, 'title', e.target.value)}
                              className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-primary)] focus:outline-none focus:ring-0 focus:border-[var(--color-accent)]"
                            />
                            <textarea
                              value={idea.description}
                              onChange={(e) => updateIdea(i, 'description', e.target.value)}
                              rows={2}
                              className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] resize-none focus:outline-none focus:ring-0 focus:border-[var(--color-accent)]"
                            />
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-[var(--color-text-primary)] leading-snug">
                              {idea.title}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                              {idea.description}
                            </p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stories */}
              {editStories.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2.5">
                    Stories & Anecdotes
                  </h4>
                  <div className="space-y-2.5">
                    {editStories.map((story, i) => (
                      <div
                        key={i}
                        className="rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] p-3"
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={story.summary}
                              onChange={(e) => updateStory(i, 'summary', e.target.value)}
                              rows={2}
                              className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] resize-none focus:outline-none focus:ring-0 focus:border-[var(--color-accent)]"
                            />
                            {story.fullText && (
                              <textarea
                                value={story.fullText}
                                onChange={(e) => updateStory(i, 'fullText', e.target.value)}
                                rows={3}
                                className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] italic resize-none focus:outline-none focus:ring-0 focus:border-[var(--color-accent)]"
                              />
                            )}
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                              {story.summary}
                            </p>
                            {story.fullText && (
                              <p className="mt-1.5 text-xs text-[var(--color-text-secondary)] leading-relaxed italic">
                                &ldquo;{story.fullText}&rdquo;
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Themes */}
              {editThemes.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2.5">
                    Themes
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {editThemes.map((theme, i) =>
                      isEditing ? (
                        <input
                          key={i}
                          type="text"
                          value={theme}
                          onChange={(e) => updateTheme(i, e.target.value)}
                          className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[var(--radius-full)] px-3 py-1 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-0 focus:border-[var(--color-accent)]"
                          style={{ width: `${Math.max(theme.length + 2, 8)}ch` }}
                        />
                      ) : (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-[var(--radius-full)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-3 py-1 text-sm text-[var(--color-text-primary)]"
                        >
                          {theme}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
