'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageWrapper from '@/components/PageWrapper';
import ScriptCard from '@/components/scripts/ScriptCard';
import ScriptEditor from '@/components/scripts/ScriptEditor';
import type { ScriptCardData } from '@/components/scripts/ScriptCard';
import type { ScriptEditorData, ScriptSection } from '@/components/scripts/ScriptEditor';
import type { ScriptStatus } from '@/models/Script';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type ScriptView = 'drafts' | 'ready' | 'published';

const VIEW_TABS: { value: ScriptView; label: string; description: string }[] = [
  { value: 'drafts', label: 'Drafts', description: 'Work in progress — scripts you should be working on' },
  { value: 'ready', label: 'Ready to Film', description: 'In the pipeline for filming' },
  { value: 'published', label: 'Published', description: 'Scripts that have gone to YouTube' },
];

/** Map each ScriptStatus to a view tab */
function statusToView(status: ScriptStatus): ScriptView {
  switch (status) {
    case 'draft':
    case 'review':
      return 'drafts';
    case 'approved':
    case 'filming':
      return 'ready';
    case 'completed':
    case 'published':
      return 'published';
    default:
      return 'drafts';
  }
}

const GENERATING_MESSAGES = [
  'Writing your script...',
  'Crafting the perfect hook...',
  'Building the narrative arc...',
  'Polishing the call-to-action...',
  'Making it sound like you...',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IdeaOption {
  _id: string;
  title: string;
  status: string;
  contentPillar?: string;
}

interface TranscriptOption {
  _id: string;
  sessionType: string;
  promptUsed?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ScriptsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedIdeaId = searchParams.get('ideaId');

  // --- State ---
  const [userId, setUserId] = useState('');
  const [scripts, setScripts] = useState<ScriptCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<ScriptView>('drafts');

  // Editor state
  const [editingScript, setEditingScript] = useState<ScriptEditorData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReverting, setIsReverting] = useState(false);

  // Generation state
  const [showGenerateForm, setShowGenerateForm] = useState(!!preselectedIdeaId);
  const [ideas, setIdeas] = useState<IdeaOption[]>([]);
  const [transcripts, setTranscripts] = useState<TranscriptOption[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState(preselectedIdeaId || '');
  const [selectedTranscriptId, setSelectedTranscriptId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState('');

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

  // --- Fetch scripts ---
  const fetchScripts = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/scripts?userId=${userId}`);
      if (!res.ok) return;
      const raw = await res.json();
      const data: ScriptCardData[] = raw.data || raw;
      setScripts(data);
    } catch (err) {
      console.error('Failed to fetch scripts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // --- Fetch ideas for dropdown ---
  const fetchIdeas = useCallback(async () => {
    try {
      const res = await fetch(`/api/ideas?userId=${userId}`);
      if (!res.ok) return;
      const raw = await res.json();
      const data: IdeaOption[] = raw.data || raw;
      // Show approved/saved/scripted ideas
      setIdeas(
        data.filter((i) =>
          ['approved', 'saved', 'scripted'].includes(i.status)
        )
      );
    } catch (err) {
      console.error('Failed to fetch ideas:', err);
    }
  }, [userId]);

  // --- Fetch transcripts for dropdown ---
  const fetchTranscripts = useCallback(async () => {
    try {
      const res = await fetch(`/api/voice-storming?userId=${userId}`);
      if (!res.ok) return;
      const rawT = await res.json();
      const data: TranscriptOption[] = rawT.data || rawT;
      setTranscripts(data);
    } catch {
      // Voice storming API might not exist yet — that's OK
    }
  }, [userId]);

  useEffect(() => {
    fetchScripts();
    fetchIdeas();
    fetchTranscripts();
  }, [fetchScripts, fetchIdeas, fetchTranscripts]);

  // --- Generate script ---
  const handleGenerate = async () => {
    if (!selectedIdeaId) return;

    setIsGenerating(true);
    setGeneratingMessage(GENERATING_MESSAGES[0]);

    const interval = setInterval(() => {
      setGeneratingMessage(
        GENERATING_MESSAGES[Math.floor(Math.random() * GENERATING_MESSAGES.length)]
      );
    }, 2000);

    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          ideaId: selectedIdeaId,
          voiceStormTranscriptId: selectedTranscriptId || undefined,
        }),
      });

      if (!res.ok) throw new Error('Generation failed');

      const newScript = await res.json();
      setScripts((prev) => [newScript, ...prev]);
      setShowGenerateForm(false);
      setSelectedIdeaId('');
      setSelectedTranscriptId('');

      // Open the editor immediately
      handleOpenEditor(newScript._id);
    } catch (err) {
      console.error('Failed to generate script:', err);
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  // --- Open script in editor ---
  const handleOpenEditor = async (scriptId: string) => {
    try {
      const res = await fetch(`/api/scripts/${scriptId}`);
      if (!res.ok) return;
      const data: ScriptEditorData = await res.json();
      setEditingScript(data);
    } catch (err) {
      console.error('Failed to load script:', err);
    }
  };

  // --- Save script changes (optimistic) ---
  const handleSave = async (updates: {
    title?: string;
    fullScript?: string;
    bulletPoints?: string[];
    teleprompterVersion?: string;
    sections?: ScriptSection[];
    status?: ScriptStatus;
    thumbnail?: string;
  }) => {
    if (!editingScript) return;

    // Save previous state for rollback
    const previousScripts = scripts;
    const previousEditingScript = editingScript;

    // Optimistic update — apply changes to UI immediately
    setScripts((prev) =>
      prev.map((s) => (s._id === editingScript._id ? { ...s, ...updates } : s))
    );
    setEditingScript((prev) => (prev ? { ...prev, ...updates } : null));

    setIsSaving(true);
    try {
      const res = await fetch(`/api/scripts/${editingScript._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error('Save failed');

      const updated = await res.json();

      // Reconcile with server response
      setScripts((prev) =>
        prev.map((s) => (s._id === updated._id ? { ...s, ...updated } : s))
      );
      setEditingScript((prev) => (prev ? { ...prev, ...updated } : null));
    } catch (err) {
      console.error('Failed to save script:', err);
      // Revert on failure
      setScripts(previousScripts);
      setEditingScript(previousEditingScript);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Regenerate script ---
  const handleRegenerate = async () => {
    if (!editingScript) return;

    setIsRegenerating(true);
    try {
      const ideaId =
        typeof editingScript.ideaId === 'object'
          ? editingScript.ideaId._id
          : editingScript.ideaId;

      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          ideaId,
        }),
      });

      if (!res.ok) throw new Error('Regeneration failed');

      const newScript = await res.json();
      setScripts((prev) => [newScript, ...prev]);
      handleOpenEditor(newScript._id);
    } catch (err) {
      console.error('Failed to regenerate script:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  // --- Add feedback ---
  const handleAddFeedback = async (text: string) => {
    if (!editingScript) return;

    try {
      const res = await fetch(`/api/scripts/${editingScript._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: {
            userId: userId,
            text,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to add feedback');

      const updated = await res.json();
      setEditingScript((prev) => (prev ? { ...prev, ...updated } : null));
    } catch (err) {
      console.error('Failed to add feedback:', err);
    }
  };

  // --- Revert script to idea stage ---
  const handleRevert = async () => {
    if (!editingScript) return;

    setIsReverting(true);
    try {
      const res = await fetch(`/api/scripts/${editingScript._id}/revert`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Revert failed');

      // Remove script from local list and close editor
      setScripts((prev) => prev.filter((s) => s._id !== editingScript._id));
      setEditingScript(null);
      router.push('/dashboard/ideas');
    } catch (err) {
      console.error('Failed to revert script:', err);
    } finally {
      setIsReverting(false);
    }
  };

  // --- Filtered scripts by view ---
  const filteredScripts = useMemo(() => {
    return scripts.filter((s) => statusToView(s.status) === activeView);
  }, [scripts, activeView]);

  // --- View counts ---
  const viewCounts = useMemo(() => {
    const counts: Record<ScriptView, number> = { drafts: 0, ready: 0, published: 0 };
    scripts.forEach((s) => {
      counts[statusToView(s.status)]++;
    });
    return counts;
  }, [scripts]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <PageWrapper title="Scripts" subtitle="AI-generated scripts based on your voice and style.">
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        </div>
      </PageWrapper>
    );
  }

  // Editor view
  if (editingScript) {
    return (
      <PageWrapper>
        <ScriptEditor
          script={editingScript}
          onSave={handleSave}
          onRegenerate={handleRegenerate}
          onAddFeedback={handleAddFeedback}
          onRevert={handleRevert}
          onClose={() => setEditingScript(null)}
          isSaving={isSaving}
          isRegenerating={isRegenerating}
          isReverting={isReverting}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Scripts" subtitle="AI-generated scripts based on your voice and style.">
      {/* ================================================================ */}
      {/* GENERATE SCRIPT SECTION                                          */}
      {/* ================================================================ */}
      <section className="mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Generate a Script
          </h2>
          {!showGenerateForm && (
            <button
              type="button"
              onClick={() => setShowGenerateForm(true)}
              style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF', borderRadius: 12, padding: '8px 16px', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              + New Script
            </button>
          )}
        </div>

        {/* Generation form */}
        {showGenerateForm && !isGenerating && (
          <div className="mt-4 animate-fadeIn rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-sm)]">
            <div className="space-y-4">
              {/* Idea selector */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text)]">
                  Select an idea *
                </label>
                {ideas.length > 0 ? (
                  <select
                    value={selectedIdeaId}
                    onChange={(e) => setSelectedIdeaId(e.target.value)}
                    className="w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                  >
                    <option value="">Choose an approved idea...</option>
                    {ideas.map((idea) => (
                      <option key={idea._id} value={idea._id}>
                        {idea.title}
                        {idea.contentPillar ? ` (${idea.contentPillar})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] p-3 text-sm text-[var(--color-text)]">
                    No approved ideas yet. Head to the Ideas page to approve some first.
                  </p>
                )}
              </div>

              {/* Transcript selector (optional) */}
              {transcripts.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--color-text)]">
                    Link a voice-storming session (optional)
                  </label>
                  <select
                    value={selectedTranscriptId}
                    onChange={(e) => setSelectedTranscriptId(e.target.value)}
                    className="w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)]"
                  >
                    <option value="">No transcript</option>
                    {transcripts.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.sessionType} session —{' '}
                        {new Date(t.createdAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!selectedIdeaId}
                className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:bg-[#555] disabled:text-[#999] disabled:cursor-not-allowed"
              >
                Generate Script
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowGenerateForm(false);
                  setSelectedIdeaId('');
                  setSelectedTranscriptId('');
                }}
                className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Generating state */}
        {isGenerating && (
          <div className="mt-4 flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-accent)] bg-[var(--color-accent-subtle)] py-12">
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-3 border-[var(--color-accent)] border-t-transparent" />
            <p className="animate-pulse text-sm font-medium text-[var(--color-accent)]">
              {generatingMessage}
            </p>
          </div>
        )}

        {/* Empty state when no form and no scripts */}
        {!showGenerateForm && !isGenerating && scripts.length === 0 && (
          <div className="mt-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-light)]">
              <svg className="h-5 w-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <p className="text-sm text-[var(--color-text)]">
              No scripts yet. Approve an idea and generate your first script.
            </p>
          </div>
        )}
      </section>

      {/* ================================================================ */}
      {/* SCRIPTS LIST WITH THREE VIEWS                                    */}
      {/* ================================================================ */}
      {scripts.length > 0 && (
        <section>
          {/* View tabs: Drafts / Ready to Film / Published */}
          <div style={{ display: 'flex', gap: 4, borderRadius: 12, backgroundColor: 'var(--color-bg-secondary)', padding: 4, marginBottom: 20 }}>
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveView(tab.value)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderRadius: 10,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  ...(activeView === tab.value
                    ? { backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)', boxShadow: 'var(--shadow-sm)' }
                    : { backgroundColor: 'transparent', color: 'var(--color-text-muted)' }),
                }}
              >
                {tab.label}
                <span
                  style={{
                    display: 'inline-flex',
                    height: 20,
                    minWidth: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 999,
                    padding: '0 6px',
                    fontSize: 12,
                    fontWeight: 600,
                    ...(activeView === tab.value
                      ? { backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }
                      : { backgroundColor: 'var(--color-hover)', color: 'var(--color-text-muted)' }),
                  }}
                >
                  {viewCounts[tab.value]}
                </span>
              </button>
            ))}
          </div>

          {/* View description */}
          <p className="mb-4 text-xs text-[var(--color-text-muted)]">
            {VIEW_TABS.find((t) => t.value === activeView)?.description}
          </p>

          {/* Script cards */}
          {filteredScripts.length > 0 ? (
            <div className="grid gap-3">
              {filteredScripts.map((script) => (
                <ScriptCard
                  key={script._id}
                  script={script}
                  onClick={(s) => handleOpenEditor(s._id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 text-center">
              <p className="text-sm text-[var(--color-text)]">
                {activeView === 'drafts' && 'No draft scripts. Generate a new script to get started.'}
                {activeView === 'ready' && 'No scripts ready to film yet. Finish editing a draft and mark it as ready.'}
                {activeView === 'published' && 'No published scripts yet. Mark a script as published after it goes to YouTube.'}
              </p>
            </div>
          )}
        </section>
      )}
    </PageWrapper>
  );
}
