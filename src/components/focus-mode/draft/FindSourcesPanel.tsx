'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { IConceptAnswers, IResource } from '@/models/ContentIdea';

interface FindSourcesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  ideaId: string;
  ideaTitle: string;
  conceptAnswers: IConceptAnswers;
  onSourcesFound: (resources: IResource[]) => void;
}

const CATEGORIES = [
  {
    id: 'stats',
    label: 'Stats & Data',
    description: 'Numbers, percentages, research findings',
    bgColor: 'rgba(239, 68, 68, 0.10)',
    iconColor: '#EF4444',
    checked: true,
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="12" width="4" height="8" rx="1" />
        <rect x="10" y="8" width="4" height="12" rx="1" />
        <rect x="16" y="4" width="4" height="16" rx="1" />
      </svg>
    ),
  },
  {
    id: 'studies',
    label: 'Studies & Research',
    description: 'Academic or clinical sources',
    bgColor: 'rgba(107, 114, 128, 0.10)',
    iconColor: '#6B7280',
    checked: true,
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714a2.25 2.25 0 0 0 .659 1.591L19 14.5m-4.75-11.396c.25.023.5.05.75.082M19 14.5v3.25a2.25 2.25 0 0 1-2.25 2.25H7.25A2.25 2.25 0 0 1 5 17.75V14.5m14 0H5" />
      </svg>
    ),
  },
  {
    id: 'news',
    label: 'News & Trends',
    description: 'Recent articles and cultural moments',
    bgColor: 'rgba(59, 130, 246, 0.10)',
    iconColor: '#3B82F6',
    checked: false,
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5" />
      </svg>
    ),
  },
  {
    id: 'quotes',
    label: 'Expert Quotes',
    description: 'Published quotes from known figures',
    bgColor: 'rgba(34, 197, 94, 0.10)',
    iconColor: '#22C55E',
    checked: false,
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
    ),
  },
  {
    id: 'examples',
    label: 'Examples & Case Studies',
    description: 'Real-world stories and examples',
    bgColor: 'rgba(245, 158, 11, 0.10)',
    iconColor: '#F59E0B',
    checked: false,
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
      </svg>
    ),
  },
];

export default function FindSourcesPanel({
  isOpen,
  onClose,
  ideaId,
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
  const [refineOpen, setRefineOpen] = useState(false);

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

  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = useCallback((seconds: number) => {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || cooldown > 0) return;
    setIsSearching(true);
    setError('');
    try {
      const categories = Object.entries(selectedCategories)
        .filter(([, v]) => v)
        .map(([k]) => k);
      const res = await fetch(`/api/ideas/${ideaId}/find-sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, categories }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          startCooldown(60);
        }
        setError(data.error || 'Failed to find sources. Please try again.');
        return;
      }
      const data = await res.json();
      if (data.resources && data.resources.length > 0) {
        onSourcesFound(data.resources);
        startCooldown(30);
      } else {
        setError('No sources found. Try adjusting your search query or categories.');
      }
    } catch {
      setError('Failed to find sources. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, selectedCategories, ideaId, onSourcesFound, cooldown, startCooldown]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-[1000] flex h-full w-full max-w-lg flex-col bg-[var(--color-bg-card)] shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
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
          <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(74, 111, 247, 0.08)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
              AI Understood Your Idea As
            </p>
            {editingQuery ? (
              <input
                data-transparent=""
                style={{ backgroundColor: 'transparent' }}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => setEditingQuery(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditingQuery(false); }}
                className="w-full bg-transparent text-sm font-medium text-[var(--color-accent)] outline-none ring-0"
                autoFocus
              />
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-[var(--color-accent)] flex-1">{searchQuery || 'No title set'}</p>
                <button
                  onClick={() => setEditingQuery(true)}
                  className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] shrink-0"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                  </svg>
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
                  className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-[var(--color-bg-secondary)]"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: cat.bgColor, color: cat.iconColor }}
                  >
                    {cat.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${selectedCategories[cat.id] ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}>
                      {cat.label}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">{cat.description}</p>
                  </div>
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
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

          {/* Refine Search */}
          <div>
            <button
              onClick={() => setRefineOpen(!refineOpen)}
              className="flex w-full items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <svg
                className={`h-4 w-4 transition-transform duration-200 ${refineOpen ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
              Refine search
            </button>
            {refineOpen && (
              <div className="mt-3 rounded-lg bg-[var(--color-bg-secondary)] p-4">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Advanced search refinement options coming soon.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 rounded-lg bg-red-900/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[var(--color-border)] px-6 py-4">
          <button
            onClick={handleSearch}
            disabled={isSearching || cooldown > 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] py-3 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {isSearching ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Searching...
              </>
            ) : cooldown > 0 ? (
              <>Search again in {cooldown}s</>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
                Find sources
              </>
            )}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
