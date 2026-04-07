'use client';

import { useState, useCallback, useEffect } from 'react';
import type { IConceptAnswers, IResource } from '@/models/ContentIdea';

interface FindSourcesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  ideaTitle: string;
  conceptAnswers: IConceptAnswers;
  onSourcesFound: (resources: IResource[]) => void;
}

const CATEGORIES = [
  { id: 'stats', label: 'Stats & Data', description: 'Numbers, percentages, research findings', icon: '\uD83D\uDCCA', checked: true },
  { id: 'studies', label: 'Studies & Research', description: 'Academic or clinical sources', icon: '\uD83D\uDD2C', checked: true },
  { id: 'news', label: 'News & Trends', description: 'Recent articles and cultural moments', icon: '\uD83D\uDCF0', checked: false },
  { id: 'quotes', label: 'Expert Quotes', description: 'Published quotes from known figures', icon: '\uD83D\uDCAC', checked: false },
  { id: 'examples', label: 'Examples & Case Studies', description: 'Real-world stories and examples', icon: '\uD83D\uDCC1', checked: false },
];

export default function FindSourcesPanel({
  isOpen,
  onClose,
  ideaTitle,
  conceptAnswers,
  onSourcesFound,
}: FindSourcesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingQuery, setEditingQuery] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(CATEGORIES.map((c) => [c.id, c.checked]))
  );
  const [isSearching, setIsSearching] = useState(false);

  // Generate search query from idea context
  useEffect(() => {
    if (isOpen && !searchQuery) {
      const parts = [ideaTitle];
      if (conceptAnswers.whoIsThisFor) parts.push(`for ${conceptAnswers.whoIsThisFor}`);
      setSearchQuery(parts.join(' '));
    }
  }, [isOpen, ideaTitle, conceptAnswers, searchQuery]);

  const toggleCategory = useCallback((id: string) => {
    setSelectedCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    // TODO: Implement actual AI source search
    // For now, simulate a brief delay and show that it's a stub
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSearching(false);
    // No sources found yet (stub)
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 z-[201] flex h-full w-full max-w-md flex-col bg-[var(--color-bg-card)] shadow-2xl transition-transform duration-400"
        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            <h2 className="text-base font-semibold text-[var(--color-text)]">Find Online Sources</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* AI Understanding */}
          <div className="rounded-lg bg-[var(--color-bg-secondary)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
              AI Understood Your Idea As
            </p>
            {editingQuery ? (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => setEditingQuery(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditingQuery(false); }}
                className="w-full bg-transparent text-sm font-medium text-[var(--color-accent)] outline-none ring-0"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[var(--color-accent)]">{searchQuery || 'No title set'}</p>
                <button
                  onClick={() => setEditingQuery(true)}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Category Selection */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">
              What kind of resources do you need?
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              Select all that apply, pre-selected for your idea type.
            </p>
            <div className="space-y-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    selectedCategories[cat.id]
                      ? 'border-[var(--color-accent)] bg-[var(--color-bg-secondary)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
                  }`}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--color-text)]">{cat.label}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{cat.description}</p>
                  </div>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                      selectedCategories[cat.id]
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                        : 'border-[var(--color-border)]'
                    }`}
                  >
                    {selectedCategories[cat.id] && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--color-border)] px-6 py-4">
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="w-full rounded-lg bg-[var(--color-accent)] py-3 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {isSearching ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Searching...
              </span>
            ) : (
              'Find sources'
            )}
          </button>
        </div>
      </div>
    </>
  );
}
