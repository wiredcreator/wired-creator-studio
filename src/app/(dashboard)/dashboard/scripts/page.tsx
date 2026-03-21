'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PageWrapper from '@/components/PageWrapper';
import ScriptCard from '@/components/scripts/ScriptCard';
import ScriptEditor from '@/components/scripts/ScriptEditor';
import type { ScriptCardData } from '@/components/scripts/ScriptCard';
import type { ScriptEditorData } from '@/components/scripts/ScriptEditor';
import type { ScriptStatus } from '@/models/Script';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_TABS: { value: ScriptStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'filming', label: 'Filming' },
  { value: 'completed', label: 'Completed' },
];

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
  const preselectedIdeaId = searchParams.get('ideaId');

  // --- State ---
  const [userId, setUserId] = useState('');
  const [scripts, setScripts] = useState<ScriptCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ScriptStatus | 'all'>('all');

  // Editor state
  const [editingScript, setEditingScript] = useState<ScriptEditorData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
    status?: ScriptStatus;
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

  // --- Filtered scripts ---
  const filteredScripts = useMemo(() => {
    if (activeTab === 'all') return scripts;
    return scripts.filter((s) => s.status === activeTab);
  }, [scripts, activeTab]);

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
          onClose={() => setEditingScript(null)}
          isSaving={isSaving}
          isRegenerating={isRegenerating}
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
              className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg-dark)] transition-colors hover:bg-[var(--color-accent-hover)]"
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

        {/* Empty state when no form */}
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
      {/* SCRIPTS LIST                                                     */}
      {/* ================================================================ */}
      {scripts.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
            Your Scripts
          </h2>

          {/* Status tabs */}
          <div className="mb-4 flex gap-1 overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] p-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.value
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg-dark)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--color-text)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

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
                No scripts match this filter.
              </p>
            </div>
          )}
        </section>
      )}
    </PageWrapper>
  );
}
