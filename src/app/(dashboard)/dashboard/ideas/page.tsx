'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageWrapper from '@/components/PageWrapper';
import IdeaCard from '@/components/ideas/IdeaCard';
import IdeaDetail from '@/components/ideas/IdeaDetail';
import IdeaStats from '@/components/ideas/IdeaStats';
import type { IdeaCardData } from '@/components/ideas/IdeaCard';
import type { ContentIdeaStatus } from '@/models/ContentIdea';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIPELINE_TABS: { value: ContentIdeaStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'approved', label: 'Approved' },
  { value: 'saved', label: 'Saved' },
  { value: 'scripted', label: 'Scripted' },
  { value: 'filmed', label: 'Filmed' },
  { value: 'published', label: 'Published' },
];

const BRAINSTORM_MESSAGES = [
  'Brainstorming ideas for you...',
  'Searching for inspiration...',
  'Cooking up something good...',
  'Thinking like your audience...',
  'Finding your next viral hit...',
];

const CONTENT_PILLAR_OPTIONS = [
  'Entrepreneurship',
  'Content Strategy',
  'Behind the Scenes',
  'Growth & Marketing',
  'Productivity',
  'Mindset',
  'Industry Insights',
  'Personal Branding',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRandomMessage(): string {
  return BRAINSTORM_MESSAGES[Math.floor(Math.random() * BRAINSTORM_MESSAGES.length)];
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function IdeasPage() {
  const router = useRouter();

  // --- State ---
  const [userId, setUserId] = useState('');
  const [ideas, setIdeas] = useState<IdeaCardData[]>([]);
  const [suggestedIdeas, setSuggestedIdeas] = useState<IdeaCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState('');
  const [activeTab, setActiveTab] = useState<ContentIdeaStatus | 'all'>('all');
  const [pillarFilter, setPillarFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<IdeaCardData | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualPillar, setManualPillar] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  // Track IDs that just got an action for animation
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());

  // Fetch session to get userId
  useEffect(() => {
    async function getSession() {
      try {
        const res = await fetch('/api/auth/session');
        const session = await res.json();
        if (session?.user?.id) {
          setUserId(session.user.id);
        }
      } catch {
        // Session fetch failed — userId remains empty
      }
    }
    getSession();
  }, []);

  // --- Fetch existing ideas on mount ---
  const fetchIdeas = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/ideas?userId=${userId}`);
      if (!res.ok) return;
      const raw = await res.json();
      const data: IdeaCardData[] = raw.data || raw;

      // Split into suggested (new AI ideas) and pipeline (everything else)
      const suggested: IdeaCardData[] = [];
      const pipeline: IdeaCardData[] = [];
      for (const idea of data) {
        if (idea.status === 'suggested') {
          suggested.push(idea);
        } else if (idea.status !== 'rejected') {
          pipeline.push(idea);
        }
      }

      setSuggestedIdeas(suggested);
      setIdeas(pipeline);
    } catch (err) {
      console.error('Failed to fetch ideas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  // --- Generate ideas ---
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratingMessage(getRandomMessage());

    // Rotate messages every 2s for fun
    const interval = setInterval(() => {
      setGeneratingMessage(getRandomMessage());
    }, 2000);

    try {
      const res = await fetch('/api/ideas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId }),
      });

      if (!res.ok) throw new Error('Generation failed');

      const data = await res.json();
      if (data.ideas) {
        setSuggestedIdeas((prev) => [...data.ideas, ...prev]);
      }
    } catch (err) {
      console.error('Failed to generate ideas:', err);
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  // --- Idea actions (optimistic updates) ---
  const updateIdeaStatus = (id: string, status: ContentIdeaStatus) => {
    // 1. Save previous state for rollback
    const previousIdeas = [...ideas];
    const previousSuggested = [...suggestedIdeas];

    // 2. Animate the card
    setAnimatingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setAnimatingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 400);

    // 3. Optimistically update UI
    // Find the idea from either list to carry its data forward
    const ideaFromSuggested = suggestedIdeas.find((i) => i._id === id);
    const ideaFromPipeline = ideas.find((i) => i._id === id);
    const targetIdea = ideaFromSuggested || ideaFromPipeline;

    // Move from suggested to pipeline if it was suggested
    setSuggestedIdeas((prev) => prev.filter((i) => i._id !== id));

    if (status === 'rejected') {
      // Remove from pipeline too
      setIdeas((prev) => prev.filter((i) => i._id !== id));
    } else {
      setIdeas((prev) => {
        const exists = prev.find((i) => i._id === id);
        if (exists) {
          return prev.map((i) => (i._id === id ? { ...i, status } : i));
        }
        // Moving from suggested to pipeline
        if (targetIdea) {
          return [{ ...targetIdea, status }, ...prev];
        }
        return prev;
      });
    }

    // 4. Fire API in background, revert on failure
    fetch(`/api/ideas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
      .then((res) => {
        if (!res.ok) {
          setIdeas(previousIdeas);
          setSuggestedIdeas(previousSuggested);
          console.error('Failed to update idea status');
        }
      })
      .catch(() => {
        setIdeas(previousIdeas);
        setSuggestedIdeas(previousSuggested);
        console.error('Failed to update idea status');
      });
  };

  const handleApprove = (id: string) => updateIdeaStatus(id, 'approved');
  const handleSave = (id: string) => updateIdeaStatus(id, 'saved');
  const handleReject = (id: string) => updateIdeaStatus(id, 'rejected');

  const handleUpdateIdea = (id: string, updates: Partial<IdeaCardData>) => {
    // 1. Save previous state for rollback
    const previousIdeas = [...ideas];
    const previousSuggested = [...suggestedIdeas];
    const previousSelected = selectedIdea;

    // 2. Optimistically update UI
    setIdeas((prev) =>
      prev.map((i) => (i._id === id ? { ...i, ...updates } : i))
    );
    setSuggestedIdeas((prev) =>
      prev.map((i) => (i._id === id ? { ...i, ...updates } : i))
    );
    if (selectedIdea?._id === id) {
      setSelectedIdea({ ...selectedIdea, ...updates });
    }

    // 3. Fire API in background, revert on failure
    fetch(`/api/ideas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
      .then((res) => {
        if (!res.ok) {
          setIdeas(previousIdeas);
          setSuggestedIdeas(previousSuggested);
          setSelectedIdea(previousSelected);
          console.error('Failed to update idea');
        }
      })
      .catch(() => {
        setIdeas(previousIdeas);
        setSuggestedIdeas(previousSuggested);
        setSelectedIdea(previousSelected);
        console.error('Failed to update idea');
      });
  };

  const handleDeleteIdea = (id: string) => {
    // 1. Save previous state for rollback
    const previousIdeas = [...ideas];
    const previousSuggested = [...suggestedIdeas];

    // 2. Optimistically remove from UI
    setIdeas((prev) => prev.filter((i) => i._id !== id));
    setSuggestedIdeas((prev) => prev.filter((i) => i._id !== id));

    // 3. Fire API in background, revert on failure
    fetch(`/api/ideas/${id}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) {
          setIdeas(previousIdeas);
          setSuggestedIdeas(previousSuggested);
          console.error('Failed to delete idea');
        }
      })
      .catch(() => {
        setIdeas(previousIdeas);
        setSuggestedIdeas(previousSuggested);
        console.error('Failed to delete idea');
      });
  };

  const handleStartScript = (id: string) => {
    router.push(`/scripts?ideaId=${id}`);
  };

  // --- Manual idea creation ---
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    setIsSubmittingManual(true);
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          title: manualTitle.trim(),
          description: manualDescription.trim(),
          source: 'manual',
          status: 'approved',
          contentPillar: manualPillar,
        }),
      });

      if (!res.ok) throw new Error('Failed to create idea');

      const newIdea: IdeaCardData = await res.json();
      setIdeas((prev) => [newIdea, ...prev]);

      // Reset form
      setManualTitle('');
      setManualDescription('');
      setManualPillar('');
      setShowManualForm(false);
    } catch (err) {
      console.error('Failed to create manual idea:', err);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // --- Computed / filtered ideas ---
  const filteredIdeas = useMemo(() => {
    let result = ideas;

    // Tab filter
    if (activeTab !== 'all') {
      result = result.filter((i) => i.status === activeTab);
    }

    // Pillar filter
    if (pillarFilter) {
      result = result.filter((i) => i.contentPillar === pillarFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }

    // Sort by date (newest first)
    return result.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [ideas, activeTab, pillarFilter, searchQuery]);

  // --- Stats ---
  const stats = useMemo(() => {
    const all = [...ideas, ...suggestedIdeas];
    return {
      total: all.length,
      approved: ideas.filter((i) => i.status === 'approved').length,
      inProgress: ideas.filter((i) =>
        ['scripted', 'filmed'].includes(i.status)
      ).length,
      published: ideas.filter((i) => i.status === 'published').length,
    };
  }, [ideas, suggestedIdeas]);

  // Unique pillars from existing ideas
  const existingPillars = useMemo(() => {
    const pillars = new Set<string>();
    for (const idea of ideas) {
      if (idea.contentPillar) pillars.add(idea.contentPillar);
    }
    return Array.from(pillars).sort();
  }, [ideas]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <PageWrapper title="Ideas" subtitle="Your content ideas, all in one place.">
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Ideas" subtitle="Your content ideas, all in one place.">
      {/* Stats bar */}
      {(ideas.length > 0 || suggestedIdeas.length > 0) && (
        <div className="mb-6">
          <IdeaStats
            total={stats.total}
            approved={stats.approved}
            inProgress={stats.inProgress}
            published={stats.published}
          />
        </div>
      )}

      {/* ================================================================ */}
      {/* IDEA GENERATOR SECTION                                           */}
      {/* ================================================================ */}
      <section className="mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Idea Generator
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowManualForm(!showManualForm)}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              + Add Manually
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg-dark)] transition-all hover:bg-[var(--color-accent-hover)] disabled:bg-[#555] disabled:text-[#999]"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </span>
              ) : (
                'Generate New Ideas'
              )}
            </button>
          </div>
        </div>

        {/* Generating state */}
        {isGenerating && (
          <div className="mt-4 flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-accent)] bg-[var(--color-accent-subtle)] py-10">
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-3 border-[var(--color-accent)] border-t-transparent" />
            <p className="animate-pulse text-sm font-medium text-[var(--color-accent)]">
              {generatingMessage}
            </p>
          </div>
        )}

        {/* Manual idea form */}
        {showManualForm && (
          <form
            onSubmit={handleManualSubmit}
            className="mt-4 animate-fadeIn rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]"
          >
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
              Add an Idea Manually
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
                  Title *
                </label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. 5 Things I Wish I Knew Before..."
                  required
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text)] placeholder:opacity-50 focus:border-[var(--color-accent)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
                  Description
                </label>
                <textarea
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="What's the angle? What makes this idea interesting?"
                  rows={3}
                  className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text)] placeholder:opacity-50 focus:border-[var(--color-accent)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
                  Content Pillar
                </label>
                <select
                  value={manualPillar}
                  onChange={(e) => setManualPillar(e.target.value)}
                  className="w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-secondary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                >
                  <option value="">Select a pillar (optional)</option>
                  {CONTENT_PILLAR_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="submit"
                disabled={isSubmittingManual || !manualTitle.trim()}
                className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:bg-[#555] disabled:text-[#999]"
              >
                {isSubmittingManual ? 'Adding...' : 'Add Idea'}
              </button>
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Suggested ideas cards */}
        {suggestedIdeas.length > 0 && !isGenerating && (
          <div className="mt-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-text)]">
              {suggestedIdeas.length} new idea{suggestedIdeas.length !== 1 ? 's' : ''} to review
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {suggestedIdeas.map((idea, index) => (
                <div
                  key={idea._id}
                  className="idea-card-enter"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <IdeaCard
                    idea={idea}
                    variant="suggested"
                    onApprove={handleApprove}
                    onSave={handleSave}
                    onReject={handleReject}
                    onClick={setSelectedIdea}
                    animationClass={
                      animatingIds.has(idea._id) ? 'idea-card-exit' : ''
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for generator */}
        {suggestedIdeas.length === 0 && !isGenerating && (
          <div className="mt-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-light)]">
              <svg className="h-5 w-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
            </div>
            <p className="text-sm text-[var(--color-text)]">
              Hit &quot;Generate New Ideas&quot; and let AI brainstorm for you.
            </p>
          </div>
        )}
      </section>

      {/* ================================================================ */}
      {/* IDEA BANK / PIPELINE SECTION                                     */}
      {/* ================================================================ */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
          Idea Bank
        </h2>

        {/* Tabs + Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Tab row */}
          <div className="flex gap-1 overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] p-1">
            {PIPELINE_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.value
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg-dark)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--color-text)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search + pillar filter */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ideas..."
              className="w-40 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text)] placeholder:opacity-50 focus:border-[var(--color-accent)]"
            />
            {existingPillars.length > 0 && (
              <select
                value={pillarFilter}
                onChange={(e) => setPillarFilter(e.target.value)}
                className="cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1.5 text-xs text-[var(--color-text-secondary)] outline-none transition-colors focus:border-[var(--color-accent)]"
              >
                <option value="">All Pillars</option>
                {existingPillars.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Pipeline ideas grid */}
        {filteredIdeas.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredIdeas.map((idea) => (
              <IdeaCard
                key={idea._id}
                idea={idea}
                variant="pipeline"
                onStatusChange={updateIdeaStatus}
                onClick={setSelectedIdea}
                animationClass={
                  animatingIds.has(idea._id) ? 'idea-card-enter' : ''
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center">
            <p className="text-sm text-[var(--color-text)]">
              {ideas.length === 0
                ? 'No ideas in your bank yet. Generate some above or add one manually.'
                : 'No ideas match the current filters.'}
            </p>
          </div>
        )}
      </section>

      {/* ================================================================ */}
      {/* IDEA DETAIL MODAL                                                */}
      {/* ================================================================ */}
      {selectedIdea && (
        <IdeaDetail
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onUpdate={handleUpdateIdea}
          onDelete={handleDeleteIdea}
          onStartScript={handleStartScript}
        />
      )}
    </PageWrapper>
  );
}
