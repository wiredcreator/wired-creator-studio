'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { IConceptAnswers, IResource } from '@/models/ContentIdea';

interface FindSourcesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  ideaId: string;
  ideaTitle: string;
  conceptAnswers: IConceptAnswers;
  resources: IResource[];
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
  resources,
  onSourcesFound,
}: FindSourcesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingQuery, setEditingQuery] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(CATEGORIES.map((c) => [c.id, c.checked]))
  );
  const [isSearching, setIsSearching] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [foundResults, setFoundResults] = useState<IResource[]>([]);
  const [selectedResults, setSelectedResults] = useState<Set<number>>(new Set());
  const lastInputHashRef = useRef('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Build a hash of inputs to detect changes
  const inputHash = useMemo(() => {
    const parts = [
      ideaTitle,
      conceptAnswers.whoIsThisFor || '',
      conceptAnswers.whatWillTheyLearn || '',
      conceptAnswers.whyShouldTheyCare || '',
      resources.map((r) => r.name).join(','),
    ];
    return parts.join('|');
  }, [ideaTitle, conceptAnswers, resources]);

  // Generate AI synthesis when panel opens or inputs change
  useEffect(() => {
    if (!isOpen) return;
    if (inputHash === lastInputHashRef.current) return;

    const hasConcept = conceptAnswers.whoIsThisFor || conceptAnswers.whatWillTheyLearn || conceptAnswers.whyShouldTheyCare;
    if (!ideaTitle && !hasConcept) return;

    let cancelled = false;
    setIsSynthesizing(true);

    fetch(`/api/ideas/${ideaId}/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'synthesize' }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.synthesis) {
          setSearchQuery(data.synthesis);
          lastInputHashRef.current = inputHash;
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback to simple concatenation
        const parts = [ideaTitle];
        if (conceptAnswers.whoIsThisFor) parts.push(`for ${conceptAnswers.whoIsThisFor}`);
        setSearchQuery(parts.join(' '));
        lastInputHashRef.current = inputHash;
      })
      .finally(() => {
        if (!cancelled) setIsSynthesizing(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, inputHash, ideaId, ideaTitle, conceptAnswers, refreshTrigger]);

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
        setFoundResults(data.resources);
        setSelectedResults(new Set(data.resources.map((_: IResource, i: number) => i)));
        startCooldown(30);
      } else {
        setError('No sources found. Try adjusting your search query or categories.');
      }
    } catch {
      setError('Failed to find sources. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, selectedCategories, ideaId, cooldown, startCooldown]);

  const toggleResult = useCallback((index: number) => {
    setSelectedResults((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handleSaveSelected = useCallback(() => {
    const toSave = foundResults.filter((_, i) => selectedResults.has(i));
    if (toSave.length > 0) {
      onSourcesFound(toSave);
    }
    setFoundResults([]);
    setSelectedResults(new Set());
  }, [foundResults, selectedResults, onSourcesFound]);

  const handleBackToSearch = useCallback(() => {
    setFoundResults([]);
    setSelectedResults(new Set());
  }, []);

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

        {foundResults.length > 0 ? (
          <>
            {/* Results review */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {foundResults.length} sources found
                </p>
                <button
                  onClick={() => {
                    if (selectedResults.size === foundResults.length) {
                      setSelectedResults(new Set());
                    } else {
                      setSelectedResults(new Set(foundResults.map((_, i) => i)));
                    }
                  }}
                  className="text-xs text-[var(--color-accent)] hover:underline"
                >
                  {selectedResults.size === foundResults.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              {foundResults.map((resource, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleResult(index)}
                  className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                    selectedResults.has(index)
                      ? 'border-[var(--color-accent)] bg-[rgba(74,111,247,0.05)]'
                      : 'border-[var(--color-border)] bg-[var(--color-bg-card)]'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                      selectedResults.has(index)
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                        : 'border-[var(--color-border)]'
                    }`}
                  >
                    {selectedResults.has(index) && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-text)]">{resource.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)] line-clamp-3">{resource.content}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Results footer */}
            <div className="flex gap-2 border-t border-[var(--color-border)] px-6 py-4">
              <button
                onClick={handleBackToSearch}
                className="flex-1 rounded-lg border border-[var(--color-border)] py-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
              >
                Back
              </button>
              <button
                onClick={handleSaveSelected}
                disabled={selectedResults.size === 0}
                className="flex-[2] rounded-lg bg-[var(--color-accent)] py-3 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                Save {selectedResults.size} source{selectedResults.size !== 1 ? 's' : ''} to idea
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Search form content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* AI Understanding */}
              <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(74, 111, 247, 0.08)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    AI Understood Your Idea As
                  </p>
                  {!isSynthesizing && !editingQuery && (
                    <button
                      onClick={() => { lastInputHashRef.current = ''; setRefreshTrigger((n) => n + 1); }}
                      className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                      title="Refresh synthesis"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                      </svg>
                      Refresh
                    </button>
                  )}
                </div>
                {isSynthesizing ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                    Synthesizing from your concept and resources...
                  </div>
                ) : editingQuery ? (
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
          </>
        )}
      </div>
    </>,
    document.body
  );
}
