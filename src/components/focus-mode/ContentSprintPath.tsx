'use client';

import { useState, useEffect, useCallback } from 'react';
import DraftEditor from './DraftEditor';

interface ContentIdea {
  _id: string;
  title: string;
  description: string;
  status: string;
  contentPillar: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  suggested: 'Suggested',
  approved: 'Approved',
  saved: 'Saved',
  scripted: 'Scripted',
  filmed: 'Filmed',
  published: 'Published',
};

const STATUS_COLORS: Record<string, string> = {
  suggested: 'var(--color-text-secondary)',
  approved: 'var(--color-success)',
  saved: 'var(--color-accent)',
  scripted: 'var(--color-warning)',
  filmed: 'var(--color-accent)',
  published: 'var(--color-success)',
};

export default function ContentSprintPath() {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIdeas() {
      try {
        const res = await fetch('/api/ideas?limit=50');
        if (res.ok) {
          const data = await res.json();
          const allIdeas: ContentIdea[] = data.data || [];
          // Sort by updatedAt descending (most recently worked on first)
          allIdeas.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          // Filter out rejected/published
          setIdeas(allIdeas.filter((i) => i.status !== 'rejected' && i.status !== 'published'));
        }
      } catch {
        // Failed to load
      } finally {
        setLoading(false);
      }
    }
    fetchIdeas();
  }, []);

  const handleSelect = useCallback((ideaId: string) => {
    setSelectedIdeaId(ideaId);
  }, []);

  const handleNewDraft = useCallback(async () => {
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Draft', source: 'manual' }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedIdeaId(data._id);
      }
    } catch {
      // Failed to create
    }
  }, []);

  if (selectedIdeaId) {
    return (
      <DraftEditor
        ideaId={selectedIdeaId}
        onBack={() => setSelectedIdeaId(null)}
        onNewDraft={handleNewDraft}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 animate-fadeIn">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        <p className="text-sm text-[var(--color-text-muted)]">Loading content ideas...</p>
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="w-full max-w-md text-center animate-fadeIn">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-bg-elevated)]">
          <svg className="h-8 w-8 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
          </svg>
        </div>
        <h2 className="text-xl font-medium text-[var(--color-text-primary)]">
          No content ideas yet
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Generate some ideas first, then come back to sprint on them.
        </p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full max-w-xl animate-fadeIn">
      <div className="mb-8 text-center">
        <h2 className="text-xl font-medium text-[var(--color-text-primary)]">
          Pick an idea to work on
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Sorted by most recently worked on
        </p>
      </div>

      <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
        {ideas.map((idea) => (
          <button
            key={idea._id}
            onClick={() => handleSelect(idea._id)}
            className="group flex w-full items-center gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 py-4 text-left transition-all hover:border-[var(--color-accent)] hover:shadow-[var(--shadow-sm)]"
          >
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                {idea.title}
              </h3>
              <div className="mt-1 flex items-center gap-3">
                <span
                  className="text-xs font-medium"
                  style={{ color: STATUS_COLORS[idea.status] || 'var(--color-text-secondary)' }}
                >
                  {STATUS_LABELS[idea.status] || idea.status}
                </span>
                {idea.contentPillar && (
                  <>
                    <span className="text-[var(--color-text-muted)]">·</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {idea.contentPillar}
                    </span>
                  </>
                )}
              </div>
            </div>
            <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
              {formatDate(idea.updatedAt)}
            </span>
            <svg className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
