'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageWrapper from '@/components/PageWrapper';
import IdeaCard from '@/components/ideas/IdeaCard';
import IdeaDetail from '@/components/ideas/IdeaDetail';
import IdeaStats from '@/components/ideas/IdeaStats';
import ContentScout from '@/components/ideas/ContentScout';
import type { ContentScoutHandle } from '@/components/ideas/ContentScout';
import { dispatchXPUpdate } from '@/lib/xp-events';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import type { IdeaCardData } from '@/components/ideas/IdeaCard';
import type { ContentIdeaStatus } from '@/models/ContentIdea';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IdeasView = 'entry' | 'own-idea' | 'find-ideas' | 'parking-lot';
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

const DEFAULT_PILLAR_OPTIONS = ['General'];

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
  emoji,
  title,
  description,
  onClick,
}: {
  emoji: string;
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
        justifyContent: 'space-between',
        borderRadius: 16,
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-card)',
        padding: '28px 28px 24px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: 'var(--shadow-sm)',
        minHeight: 200,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
    >
      <div>
        <span style={{ fontSize: 28, display: 'block', marginBottom: 16 }}>{emoji}</span>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{description}</p>
      </div>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-accent)', marginTop: 16 }}>
        Get started →
      </span>
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
  return <IdeasPageInner initialView="entry" />;
}

export function IdeasPageInner({ initialView = 'entry' }: { initialView?: IdeasView }) {
  const router = useRouter();

  // --- View State (driven by URL slug) ---
  const currentView: IdeasView = initialView;

  const setCurrentView = useCallback((v: IdeasView) => {
    const viewMap: Record<IdeasView, string> = {
      'entry': '/dashboard/ideas',
      'own-idea': '/dashboard/ideas/new',
      'find-ideas': '/dashboard/ideas/discover',
      'parking-lot': '/dashboard/ideas/parking-lot',
    };
    router.push(viewMap[v]);
  }, [router]);
  const [findIdeasTab, setFindIdeasTab] = useState<FindIdeasTab>('brand-brain');
  const contentScoutRef = useRef<ContentScoutHandle>(null);

  // --- Data State ---
  const [userId, setUserId] = useState('');
  const [ideas, setIdeas] = useState<IdeaCardData[]>([]);
  const [suggestedIdeas, setSuggestedIdeas] = useState<IdeaCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState('');
  const [activeTab, setActiveTab] = useState<ContentIdeaStatus | 'all'>('all');
  const [pillarFilter, setPillarFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedIdea, setSelectedIdea] = useState<IdeaCardData | null>(null);

  // Multi-select for suggested ideas (checkbox mode)
  const [selectedSuggestedIds, setSelectedSuggestedIds] = useState<Set<string>>(new Set());
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Clear suggested ideas
  const [isClearing, setIsClearing] = useState(false);

  // Brand Brain pillars
  const [brandBrainPillars, setBrandBrainPillars] = useState<string[]>([]);

  // Saved tag library (for colored tag pills)
  const [savedTags, setSavedTags] = useState<Array<{ name: string; color: string }>>([]);

  // Manual idea form
  const [manualTitle, setManualTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualPillar, setManualPillar] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Animation
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());

  // Delete confirmation modal
  const [ideaToDelete, setIdeaToDelete] = useState<IdeaCardData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create new idea
  const [isCreating, setIsCreating] = useState(false);

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

  // --- Fetch Brand Brain pillars ---
  useEffect(() => {
    async function fetchBrandBrain() {
      try {
        const res = await fetch('/api/brand-brain');
        if (!res.ok) return;
        const data = await res.json();
        if (data.contentPillars && Array.isArray(data.contentPillars)) {
          const titles = data.contentPillars
            .map((p: { title?: string }) => p.title)
            .filter(Boolean);
          if (titles.length > 0) {
            setBrandBrainPillars(titles);
          }
        }
      } catch {
        // Brand Brain fetch failed — will fall back to defaults
      }
    }
    fetchBrandBrain();
  }, []);

  // --- Fetch saved tag library ---
  useEffect(() => {
    async function fetchTags() {
      try {
        const res = await fetch('/api/tags');
        if (!res.ok) return;
        const data = await res.json();
        if (data.tags && Array.isArray(data.tags)) {
          setSavedTags(data.tags);
        }
      } catch {
        // Tag library fetch failed — tags will render without colors
      }
    }
    fetchTags();
  }, []);

  // --- Fetch existing ideas on mount ---
  const fetchIdeas = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/ideas?userId=${userId}&limit=100`);
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
        dispatchXPUpdate();
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

  // --- Multi-select handlers for suggested ideas ---
  const toggleSuggestedSelect = (id: string) => {
    setSelectedSuggestedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkSaveSelected = async () => {
    if (selectedSuggestedIds.size === 0) return;
    setIsBulkSaving(true);

    const idsToSave = Array.from(selectedSuggestedIds);

    // Optimistic: move selected ideas to pipeline
    const movedIdeas = suggestedIdeas.filter((i) => idsToSave.includes(i._id));
    setSuggestedIdeas((prev) => prev.filter((i) => !idsToSave.includes(i._id)));
    setIdeas((prev) => [
      ...movedIdeas.map((i) => ({ ...i, status: 'saved' as ContentIdeaStatus })),
      ...prev,
    ]);
    setSelectedSuggestedIds(new Set());

    // Bulk update on server
    try {
      const res = await fetch('/api/ideas/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaIds: idsToSave, status: 'saved' }),
      });
      if (!res.ok) {
        // Rollback on failure
        fetchIdeas();
      }
    } catch {
      fetchIdeas();
    } finally {
      setIsBulkSaving(false);
    }
  };

  // --- Clear all suggested ideas ---
  const handleClearSuggested = async () => {
    if (suggestedIdeas.length === 0 || isClearing) return;
    setIsClearing(true);

    const previousSuggested = [...suggestedIdeas];
    setSuggestedIdeas([]);
    setSelectedSuggestedIds(new Set());

    try {
      const res = await fetch('/api/ideas/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'suggested' }),
      });
      if (!res.ok) {
        setSuggestedIdeas(previousSuggested);
      }
    } catch {
      setSuggestedIdeas(previousSuggested);
    } finally {
      setIsClearing(false);
    }
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
      dispatchXPUpdate();

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

  // --- Voice recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');
          const res = await fetch('/api/voice-storming/transcribe', {
            method: 'POST',
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            if (data.text) {
              setManualTitle((prev) => (prev ? prev + ' ' + data.text : data.text));
            }
          }
        } catch (err) {
          console.error('Transcription failed:', err);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      alert('Could not access microphone. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // --- Create new idea and navigate to detail page ---
  const handleCreateNewIdea = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: 'Untitled Idea',
          source: 'manual',
          status: 'saved',
        }),
      });
      if (!res.ok) throw new Error('Failed to create idea');
      const newIdea = await res.json();
      dispatchXPUpdate();
      router.push(`/dashboard/ideas/${newIdea._id}`);
    } catch (err) {
      console.error('Failed to create new idea:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // --- Delete confirmation modal handlers ---
  const handleConfirmDelete = async () => {
    if (!ideaToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/ideas/${ideaToDelete._id}`, { method: 'DELETE' });
      if (res.ok) {
        setIdeas((prev) => prev.filter((i) => i._id !== ideaToDelete._id));
        setSuggestedIdeas((prev) => prev.filter((i) => i._id !== ideaToDelete._id));
      }
    } catch (err) {
      console.error('Failed to delete idea:', err);
    } finally {
      setIsDeleting(false);
      setIdeaToDelete(null);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- Computed / filtered ideas ---
  const filteredIdeas = useMemo(() => {
    let result = ideas;

    if (activeTab !== 'all') {
      result = result.filter((i) => i.status === activeTab);
    }

    if (pillarFilter) {
      if (pillarFilter === '__uncategorized__') {
        result = result.filter((i) => !i.contentPillar);
      } else {
        result = result.filter((i) => i.contentPillar === pillarFilter);
      }
    }

    if (priorityFilter) {
      result = result.filter((i) => (i.priority || 'none') === priorityFilter);
    }

    if (tagFilter) {
      result = result.filter((i) => i.tags?.includes(tagFilter));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }

    const dir = sortOrder === 'newest' ? 1 : -1;
    return result.sort(
      (a, b) =>
        dir * (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  }, [ideas, activeTab, pillarFilter, priorityFilter, tagFilter, searchQuery, sortOrder]);

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

  // Combine Brand Brain pillars with any extra pillars found on existing ideas
  const pillarOptions = useMemo(() => {
    const pillarSet = new Set<string>(brandBrainPillars);
    for (const idea of ideas) {
      if (idea.contentPillar) pillarSet.add(idea.contentPillar);
    }
    return Array.from(pillarSet).sort();
  }, [brandBrainPillars, ideas]);

  // Final list: use Brand Brain pillars if available, otherwise minimal defaults
  const availablePillars = pillarOptions.length > 0 ? pillarOptions : DEFAULT_PILLAR_OPTIONS;

  // Collect all unique tags from ideas
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const idea of ideas) {
      if (idea.tags) {
        for (const tag of idea.tags) tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }, [ideas]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={currentView === 'entry' || currentView === 'own-idea' || currentView === 'parking-lot' ? undefined : 'Ideas'} wide={currentView === 'parking-lot'}>

      {/* ================================================================ */}
      {/* ENTRY POINTS VIEW                                                */}
      {/* ================================================================ */}
      {currentView === 'entry' && (
        <div>
          <div className="mb-8 text-center">
            <span className="mb-4 inline-block rounded-full bg-[var(--color-accent-light)] px-4 py-1.5 text-xs font-medium text-[var(--color-accent)]">
              ✨ Idea Studio
            </span>
            <h1 className="font-heading text-[28px] font-bold tracking-tight text-[var(--color-text-primary)]">
              What do you want to create?
            </h1>
            <p className="mt-2 text-[15px] text-[var(--color-text-muted)]">
              Pick one path below — you can always come back and choose another.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <EntryCard
              emoji="✏️"
              title="Start with my own idea"
              description="You've got a spark. Let's develop it into a full content plan."
              onClick={() => setCurrentView('own-idea')}
            />

            <EntryCard
              emoji="✨"
              title="Find ideas for me"
              description="Get AI-powered ideas tailored to your niche and content style."
              onClick={() => setCurrentView('find-ideas')}
            />

            <EntryCard
              emoji="📦"
              title="Idea parking lot"
              description="Browse the ideas you've saved — ready when you are."
              onClick={() => setCurrentView('parking-lot')}
            />
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* OWN IDEA VIEW                                                    */}
      {/* ================================================================ */}
      {currentView === 'own-idea' && (
        <div>
          <BackButton onClick={() => setCurrentView('entry')} />

          <div className="mx-auto max-w-lg text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#9B7FD4] bg-[#9B7FD4]/10">
              <span className="text-3xl">💡</span>
            </div>

            <h2 className="mb-2 text-xl font-bold text-[var(--color-text-primary)]">
              What&apos;s your idea?
            </h2>
            <p className="mb-6 text-sm text-[var(--color-text-muted)]">
              Just the title is enough — you can flesh it out after.
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. How I plan a month of content in one day"
                  required
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 pr-12 text-sm text-[var(--color-text-primary)] outline-none ring-0 transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
                />
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={isTranscribing}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                    isRecording
                      ? 'text-red-500 animate-pulse'
                      : isTranscribing
                        ? 'text-[var(--color-accent)] opacity-60'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                  }`}
                  title={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing...' : 'Voice input'}
                >
                  {isRecording ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Recording indicator */}
              {isRecording && (
                <div className="flex items-center gap-2 text-xs text-red-400">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span>Recording: {formatRecordingTime(recordingTime)}</span>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="ml-1 rounded-[var(--radius-sm)] border border-red-500/40 px-2 py-0.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    Stop
                  </button>
                </div>
              )}

              {/* Transcribing indicator */}
              {isTranscribing && (
                <div className="flex items-center gap-2 text-xs text-[var(--color-accent)]">
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Transcribing audio...</span>
                </div>
              )}

              <select
                value={manualPillar}
                onChange={(e) => setManualPillar(e.target.value)}
                className="w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none ring-0 transition-colors focus:border-[var(--color-accent)]"
              >
                <option value="">No pillar (optional)</option>
                {availablePillars.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <p className="text-xs text-[var(--color-text-muted)]">
                Type your idea or click the mic to speak it — press ↵ Enter to save.
              </p>

              <button
                type="submit"
                disabled={isSubmittingManual || !manualTitle.trim()}
                className="w-full rounded-[var(--radius-md)] bg-[#9B7FD4] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#8A6BC5] disabled:bg-[#555] disabled:text-[#999]"
              >
                {isSubmittingManual ? 'Saving...' : '💡 Save Idea'}
              </button>
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

          {/* Heading + tabs + regenerate — single row */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              Find Content Ideas
            </h2>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setFindIdeasTab('brand-brain')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  findIdeasTab === 'brand-brain'
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg-dark)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:opacity-80'
                }`}
              >
                Brand Brain
              </button>
              <button
                type="button"
                onClick={() => setFindIdeasTab('content-scout')}
                className={`text-sm font-medium transition-colors ${
                  findIdeasTab === 'content-scout'
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:opacity-80'
                }`}
              >
                Content Scout
              </button>
              {findIdeasTab === 'brand-brain' && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                    suggestedIdeas.length === 0 && !isGenerating
                      ? 'bg-[var(--color-accent)] text-[var(--color-bg-dark)] hover:bg-[var(--color-accent-hover)]'
                      : 'border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
                  }`}
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Generating...
                    </span>
                  ) : suggestedIdeas.length === 0 ? (
                    <span className="flex items-center gap-1.5">
                      <span>✦</span>
                      Generate Ideas
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span>&#8635;</span>
                      Regenerate
                    </span>
                  )}
                </button>
              )}
              {findIdeasTab === 'content-scout' && (
                <button
                  type="button"
                  onClick={() => contentScoutRef.current?.regenerate()}
                  className="rounded-full border border-[var(--color-border)] px-4 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  <span className="flex items-center gap-1.5">
                    <span>&#8635;</span>
                    Regenerate
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Brand Brain Tab */}
          {findIdeasTab === 'brand-brain' && (
            <div>

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
                  {/* Clear All bar */}
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {suggestedIdeas.length} idea{suggestedIdeas.length !== 1 ? 's' : ''} generated
                    </p>
                    <button
                      type="button"
                      onClick={handleClearSuggested}
                      disabled={isClearing}
                      className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-red-400 hover:text-red-400 disabled:opacity-50"
                    >
                      {isClearing ? 'Clearing...' : 'Clear All'}
                    </button>
                  </div>

                  {/* Bulk action bar */}
                  {selectedSuggestedIds.size > 0 && (
                    <div className="mb-3 flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-accent)] bg-[var(--color-bg-secondary)] px-4 py-2.5">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        {selectedSuggestedIds.size} idea{selectedSuggestedIds.size > 1 ? 's' : ''} selected
                      </span>
                      <button
                        type="button"
                        onClick={handleBulkSaveSelected}
                        disabled={isBulkSaving}
                        className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-1.5 text-xs font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                      >
                        {isBulkSaving ? 'Saving...' : 'Save to Parking Lot'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSuggestedIds(new Set())}
                        className="text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                      >
                        Clear selection
                      </button>
                    </div>
                  )}

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
                          isSelected={selectedSuggestedIds.has(idea._id)}
                          onToggleSelect={toggleSuggestedSelect}
                          savedTags={savedTags}
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

          {/* Content Scout Tab */}
          {findIdeasTab === 'content-scout' && (
            <ContentScout ref={contentScoutRef} userId={userId} />
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* PARKING LOT VIEW                                                 */}
      {/* ================================================================ */}
      {currentView === 'parking-lot' && (
        <div>
          <BackButton onClick={() => setCurrentView('entry')} />

          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="font-heading text-[28px] font-bold tracking-tight text-[var(--color-text-primary)]">
                Idea Parking Lot
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {filteredIdeas.length} of {ideas.length} ideas
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreateNewIdea}
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
            >
              {isCreating ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-text-primary)] border-t-transparent" />
              ) : null}
              Create New Idea
            </button>
          </div>

          {/* Search + sort + filters */}
          <div className="mb-4 grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="relative">
              <svg className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ideas..."
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] py-2.5 pl-11 pr-3 text-sm text-[var(--color-text-primary)] outline-none ring-0 transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
              />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                className="min-w-0 flex-1 cursor-pointer truncate rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-2.5 text-sm text-[var(--color-text-secondary)] outline-none ring-0 transition-colors focus:border-[var(--color-accent)]"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
              <select
                value={pillarFilter}
                onChange={(e) => setPillarFilter(e.target.value)}
                className="min-w-0 flex-1 cursor-pointer truncate rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-2.5 text-sm text-[var(--color-text-secondary)] outline-none ring-0 transition-colors focus:border-[var(--color-accent)]"
              >
                <option value="">All Pillars</option>
                <option value="__uncategorized__">Uncategorized</option>
                {availablePillars.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="min-w-0 flex-1 cursor-pointer truncate rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-2.5 text-sm text-[var(--color-text-secondary)] outline-none ring-0 transition-colors focus:border-[var(--color-accent)]"
              >
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="none">No priority</option>
              </select>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="min-w-0 flex-1 cursor-pointer truncate rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-2.5 text-sm text-[var(--color-text-secondary)] outline-none ring-0 transition-colors focus:border-[var(--color-accent)]"
              >
                <option value="">All Tags</option>
                {availableTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
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
                  onClick={(idea) => router.push(`/dashboard/ideas/${idea._id}`)}
                  onDelete={(_id: string) => setIdeaToDelete(idea)}
                  savedTags={savedTags}
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

      {ideaToDelete && (
        <ConfirmDeleteModal
          itemType="idea"
          itemName={ideaToDelete.title}
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setIdeaToDelete(null)}
        />
      )}
    </PageWrapper>
  );
}
