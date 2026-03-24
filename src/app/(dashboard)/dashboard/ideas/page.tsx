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
// Types
// ---------------------------------------------------------------------------

type IdeasView = 'entry' | 'own-idea' | 'find-ideas' | 'parking-lot';
type FindIdeasTab = 'brand-brain' | 'content-scout';

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
// Entry Point Card
// ---------------------------------------------------------------------------

function EntryCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        borderRadius: 16,
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-card)',
        padding: '36px 28px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
    >
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        backgroundColor: 'var(--color-accent-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--color-accent)',
      }}>
        {icon}
      </div>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>{title}</h3>
        <p style={{ marginTop: 8, fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{description}</p>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Back Button
// ---------------------------------------------------------------------------

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-6 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
      </svg>
      Back
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function IdeasPage() {
  const router = useRouter();

  // --- View State ---
  const [currentView, setCurrentView] = useState<IdeasView>('entry');
  const [findIdeasTab, setFindIdeasTab] = useState<FindIdeasTab>('brand-brain');

  // --- Data State ---
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

  // Manual idea form
  const [manualTitle, setManualTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualPillar, setManualPillar] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Animation
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
        // Session fetch failed
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

  // --- Generate ideas (Brand Brain) ---
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratingMessage(getRandomMessage());

    const interval = setInterval(() => {
      setGeneratingMessage(getRandomMessage());
    }, 2000);

    try {
      const res = await fetch('/api/ideas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
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
    const previousIdeas = [...ideas];
    const previousSuggested = [...suggestedIdeas];

    setAnimatingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setAnimatingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 400);

    const ideaFromSuggested = suggestedIdeas.find((i) => i._id === id);
    const ideaFromPipeline = ideas.find((i) => i._id === id);
    const targetIdea = ideaFromSuggested || ideaFromPipeline;

    setSuggestedIdeas((prev) => prev.filter((i) => i._id !== id));

    if (status === 'rejected') {
      setIdeas((prev) => prev.filter((i) => i._id !== id));
    } else {
      setIdeas((prev) => {
        const exists = prev.find((i) => i._id === id);
        if (exists) {
          return prev.map((i) => (i._id === id ? { ...i, status } : i));
        }
        if (targetIdea) {
          return [{ ...targetIdea, status }, ...prev];
        }
        return prev;
      });
    }

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
    const previousIdeas = [...ideas];
    const previousSuggested = [...suggestedIdeas];
    const previousSelected = selectedIdea;

    setIdeas((prev) =>
      prev.map((i) => (i._id === id ? { ...i, ...updates } : i))
    );
    setSuggestedIdeas((prev) =>
      prev.map((i) => (i._id === id ? { ...i, ...updates } : i))
    );
    if (selectedIdea?._id === id) {
      setSelectedIdea({ ...selectedIdea, ...updates });
    }

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
    const previousIdeas = [...ideas];
    const previousSuggested = [...suggestedIdeas];

    setIdeas((prev) => prev.filter((i) => i._id !== id));
    setSuggestedIdeas((prev) => prev.filter((i) => i._id !== id));

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
          userId,
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

      // Reset form and go to parking lot to see the new idea
      setManualTitle('');
      setManualDescription('');
      setManualPillar('');
      setCurrentView('parking-lot');
    } catch (err) {
      console.error('Failed to create manual idea:', err);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // --- Computed / filtered ideas ---
  const filteredIdeas = useMemo(() => {
    let result = ideas;

    if (activeTab !== 'all') {
      result = result.filter((i) => i.status === activeTab);
    }

    if (pillarFilter) {
      result = result.filter((i) => i.contentPillar === pillarFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }

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

      {/* ================================================================ */}
      {/* ENTRY POINTS VIEW                                                */}
      {/* ================================================================ */}
      {currentView === 'entry' && (
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Start with my own idea */}
          <EntryCard
            icon={
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
            }
            title="Start with my own idea"
            description="Have something in mind? Create an idea from scratch."
            onClick={() => setCurrentView('own-idea')}
          />

          {/* Find ideas for me */}
          <EntryCard
            icon={
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
              </svg>
            }
            title="Find ideas for me"
            description="Let AI generate ideas from your Brand Brain or discover trends."
            onClick={() => setCurrentView('find-ideas')}
          />

          {/* View idea parking lot */}
          <EntryCard
            icon={
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
              </svg>
            }
            title="View idea parking lot"
            description={`Browse and manage your ${ideas.length + suggestedIdeas.length} saved ideas.`}
            onClick={() => setCurrentView('parking-lot')}
          />
        </div>
      )}

      {/* ================================================================ */}
      {/* OWN IDEA VIEW                                                    */}
      {/* ================================================================ */}
      {currentView === 'own-idea' && (
        <div>
          <BackButton onClick={() => setCurrentView('entry')} />

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-[var(--shadow-sm)]">
            <h2 className="mb-5 text-lg font-semibold text-[var(--color-text-primary)]">
              Create Your Idea
            </h2>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                  Title
                </label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. 5 Things I Wish I Knew Before..."
                  required
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none ring-0 transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                  Concept
                </label>
                <textarea
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="What's the angle? What makes this idea interesting?"
                  rows={4}
                  className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none ring-0 transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                  Content Pillar
                </label>
                <select
                  value={manualPillar}
                  onChange={(e) => setManualPillar(e.target.value)}
                  className="w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] outline-none ring-0 transition-colors focus:border-[var(--color-accent)]"
                >
                  <option value="">Select a pillar (optional)</option>
                  {CONTENT_PILLAR_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingManual || !manualTitle.trim()}
                  className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:bg-[#555] disabled:text-[#999]"
                >
                  {isSubmittingManual ? 'Creating...' : 'Create Idea'}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('entry')}
                  className="rounded-[var(--radius-md)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* FIND IDEAS VIEW                                                  */}
      {/* ================================================================ */}
      {currentView === 'find-ideas' && (
        <div>
          <BackButton onClick={() => setCurrentView('entry')} />

          {/* Sub-tabs: Brand Brain | Content Scout */}
          <div className="mb-6 flex gap-1 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] p-1">
            <button
              type="button"
              onClick={() => setFindIdeasTab('brand-brain')}
              className={`flex-1 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-medium transition-colors ${
                findIdeasTab === 'brand-brain'
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-dark)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Brand Brain
            </button>
            <button
              type="button"
              onClick={() => setFindIdeasTab('content-scout')}
              className={`flex-1 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-medium transition-colors ${
                findIdeasTab === 'content-scout'
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-dark)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              Content Scout
            </button>
          </div>

          {/* Brand Brain Tab */}
          {findIdeasTab === 'brand-brain' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    Brand Brain Ideas
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Generate ideas based on your Brand Brain context, brain dumps, and content pillars.
                  </p>
                </div>
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
                    'Generate Ideas'
                  )}
                </button>
              </div>

              {/* Generating state */}
              {isGenerating && (
                <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-accent)] bg-[var(--color-accent-subtle)] py-10">
                  <div className="mb-3 h-8 w-8 animate-spin rounded-full border-3 border-[var(--color-accent)] border-t-transparent" />
                  <p className="animate-pulse text-sm font-medium text-[var(--color-accent)]">
                    {generatingMessage}
                  </p>
                </div>
              )}

              {/* Suggested ideas cards */}
              {suggestedIdeas.length > 0 && !isGenerating && (
                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
                    {suggestedIdeas.length} idea{suggestedIdeas.length !== 1 ? 's' : ''} to review
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

              {/* Empty state */}
              {suggestedIdeas.length === 0 && !isGenerating && (
                <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-light)]">
                    <svg className="h-5 w-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                    </svg>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Hit &quot;Generate Ideas&quot; and let your Brand Brain brainstorm for you.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Content Scout Tab — Coming Soon */}
          {findIdeasTab === 'content-scout' && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-bg-secondary)]">
                <svg className="h-7 w-7 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Content Scout
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
                Content Scout will automatically discover trending topics and viral content ideas from YouTube, Reddit, and X relevant to your niche. Stay ahead of the curve without the manual research.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-[var(--radius-full)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Coming Soon
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* PARKING LOT VIEW                                                 */}
      {/* ================================================================ */}
      {currentView === 'parking-lot' && (
        <div>
          <BackButton onClick={() => setCurrentView('entry')} />

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

          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
            Idea Parking Lot
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
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
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
                className="w-40 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none ring-0 transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
              />
              {existingPillars.length > 0 && (
                <select
                  value={pillarFilter}
                  onChange={(e) => setPillarFilter(e.target.value)}
                  className="cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1.5 text-xs text-[var(--color-text-secondary)] outline-none ring-0 transition-colors focus:border-[var(--color-accent)]"
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
              <p className="text-sm text-[var(--color-text-secondary)]">
                {ideas.length === 0
                  ? 'No ideas in your parking lot yet. Create one or generate some with Brand Brain.'
                  : 'No ideas match the current filters.'}
              </p>
            </div>
          )}
        </div>
      )}

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
