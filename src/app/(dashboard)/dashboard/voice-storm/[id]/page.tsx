'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import PageWrapper from '@/components/PageWrapper';
import VoiceInputWrapper from '@/components/VoiceInputWrapper';

interface VoiceStormSession {
  _id: string;
  title?: string;
  transcript: string;
  extractedInsights: { _id: string; type: string; content: string; contentPillar: string }[];
  duration: number;
  promptUsed?: string;
  linkedIdeaIds?: string[];
  createdAt: string;
  updatedAt?: string;
}

interface LinkedIdea {
  _id: string;
  title: string;
}

interface Idea {
  _id: string;
  title: string;
  status: string;
}

const INSIGHT_SECTIONS = [
  { type: 'idea', label: 'Content Ideas', border: 'border-l-amber-400', badge: 'bg-amber-900 text-amber-300' },
  { type: 'story', label: 'Stories', border: 'border-l-purple-400', badge: 'bg-purple-900 text-purple-300' },
  { type: 'theme', label: 'Themes', border: 'border-l-blue-400', badge: 'bg-blue-900 text-blue-300' },
  { type: 'action_item', label: 'Action Items', border: 'border-l-emerald-400', badge: 'bg-emerald-900 text-emerald-300' },
];

const normalizeType = (type: string) => type === 'insight' ? 'action_item' : type;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function VoiceStormDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [session, setSession] = useState<VoiceStormSession | null>(null);
  const [linkedIdeas, setLinkedIdeas] = useState<LinkedIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  // Transcript editing
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState('');

  // Processing
  const [processing, setProcessing] = useState(false);

  // Action menu
  const [menuOpen, setMenuOpen] = useState(false);

  // Pushed insight IDs (optimistic)
  const [pushedInsightIds, setPushedInsightIds] = useState<Set<string>>(new Set());

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  // Link ideas dropdown
  const [linkDropdownOpen, setLinkDropdownOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [allIdeas, setAllIdeas] = useState<Idea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const linkDropdownRef = useRef<HTMLDivElement | null>(null);

  useUnsavedChanges(
    (editingTitle && titleDraft !== (session?.title || '')) ||
    (editingTranscript && transcriptDraft !== (session?.transcript || ''))
  );

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/voice-storming/${id}`);
      if (res.status === 404) {
        router.push('/dashboard/voice-storm');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch session');
      const data = await res.json();
      const s: VoiceStormSession = {
        ...data,
        linkedIdeaIds: data.linkedIdeaIds || [],
        extractedInsights: (data.extractedInsights || []).map((ins: { _id: string; type: string; content: string; contentPillar: string }) => ({
          ...ins,
          type: normalizeType(ins.type),
        })),
      };
      setSession(s);
      setError(false);

      // Fetch linked idea titles if present
      if (s.linkedIdeaIds && s.linkedIdeaIds.length > 0) {
        const ideaPromises = s.linkedIdeaIds.map(async (ideaId: string) => {
          try {
            const ideaRes = await fetch(`/api/ideas/${ideaId}`);
            if (ideaRes.ok) {
              const ideaData = await ideaRes.json();
              return { _id: ideaData._id, title: ideaData.title } as LinkedIdea;
            }
          } catch {
            // Silently fail — linked idea may have been deleted
          }
          return null;
        });
        const results = await Promise.all(ideaPromises);
        setLinkedIdeas(results.filter((r): r is LinkedIdea => r !== null));
      } else {
        setLinkedIdeas([]);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Close link dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (linkDropdownRef.current && !linkDropdownRef.current.contains(e.target as Node)) {
        setLinkDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAllIdeas = async () => {
    if (allIdeas.length > 0) return; // Already fetched
    setLoadingIdeas(true);
    try {
      const res = await fetch('/api/ideas?status=approved&limit=50');
      if (res.ok) {
        const data = await res.json();
        setAllIdeas(data.data || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingIdeas(false);
    }
  };

  const handleOpenLinkDropdown = () => {
    setLinkDropdownOpen(true);
    setLinkSearch('');
    fetchAllIdeas();
  };

  const handleToggleLinkedIdea = async (ideaId: string) => {
    if (!session) return;
    const currentIds = session.linkedIdeaIds || [];
    const isLinked = currentIds.includes(ideaId);
    const newIds = isLinked
      ? currentIds.filter((cid) => cid !== ideaId)
      : [...currentIds, ideaId];

    // Optimistic update
    setSession({ ...session, linkedIdeaIds: newIds });

    // Update linked ideas display
    if (isLinked) {
      setLinkedIdeas((prev) => prev.filter((li) => li._id !== ideaId));
    } else {
      const idea = allIdeas.find((i) => i._id === ideaId);
      if (idea) {
        setLinkedIdeas((prev) => [...prev, { _id: idea._id, title: idea.title }]);
      }
    }

    // Save immediately
    try {
      const res = await fetch(`/api/voice-storming/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedIdeaIds: newIds }),
      });
      if (!res.ok) throw new Error('Failed');
      showToast(isLinked ? 'Idea unlinked' : 'Idea linked');
    } catch {
      // Revert on failure
      setSession((prev) => prev ? { ...prev, linkedIdeaIds: currentIds } : prev);
      if (isLinked) {
        const idea = allIdeas.find((i) => i._id === ideaId);
        if (idea) setLinkedIdeas((prev) => [...prev, { _id: idea._id, title: idea.title }]);
      } else {
        setLinkedIdeas((prev) => prev.filter((li) => li._id !== ideaId));
      }
      showToast('Failed to update linked ideas');
    }
  };

  const handleRemoveLinkedIdea = async (ideaId: string) => {
    await handleToggleLinkedIdea(ideaId);
  };

  const handleSaveTitle = (newTitle: string) => {
    if (!session) return;
    const previousTitle = session.title;
    // Optimistic: update UI immediately
    setSession({ ...session, title: newTitle });
    setEditingTitle(false);
    showToast('Title updated');

    fetch(`/api/voice-storming/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
      })
      .catch(() => {
        // Revert on failure
        setSession((prev) => prev ? { ...prev, title: previousTitle } : prev);
        showToast('Failed to update title');
      });
  };

  const handleSaveTranscript = (newTranscript: string) => {
    if (!session) return;
    const previousTranscript = session.transcript;
    // Optimistic: update UI and exit edit mode immediately
    setSession({ ...session, transcript: newTranscript });
    setEditingTranscript(false);
    showToast('Transcript updated');

    fetch(`/api/voice-storming/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: newTranscript }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
      })
      .catch(() => {
        // Revert on failure
        setSession((prev) => prev ? { ...prev, transcript: previousTranscript } : prev);
        showToast('Failed to update transcript');
      });
  };

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/voice-storming/${id}/process`, { method: 'POST' });
      if (res.status === 409) {
        showToast('This session was recently processed. Please wait before re-processing.');
      } else if (res.ok) {
        await fetchSession();
        showToast('Session processed successfully');
      } else {
        showToast('Failed to process session');
      }
    } catch {
      showToast('Failed to process session');
    } finally {
      setProcessing(false);
    }
  };

  const handlePushIdea = (insightId: string) => {
    // Optimistic: mark as pushed immediately
    setPushedInsightIds((prev) => new Set(prev).add(insightId));
    showToast('Insight pushed to ideas');

    fetch(`/api/voice-storming/${id}/push-idea`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insightId }),
    })
      .then((res) => {
        if (res.status === 409) {
          // Already pushed — that's fine, keep the "Pushed" indicator
          return;
        }
        if (!res.ok) throw new Error('Failed');
      })
      .catch(() => {
        // Revert on failure
        setPushedInsightIds((prev) => {
          const next = new Set(prev);
          next.delete(insightId);
          return next;
        });
        showToast('Failed to push insight');
      });
  };

  const handleDeleteInsight = (insightId: string) => {
    if (!session) return;
    if (!confirm('Delete this insight?')) return;
    const previousInsights = session.extractedInsights;
    const filtered = previousInsights.filter((i) => i._id !== insightId);
    // Optimistic: remove from UI immediately
    setSession({ ...session, extractedInsights: filtered });
    showToast('Insight deleted');

    fetch(`/api/voice-storming/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extractedInsights: filtered }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
      })
      .catch(() => {
        // Revert on failure
        setSession((prev) => prev ? { ...prev, extractedInsights: previousInsights } : prev);
        showToast('Failed to delete insight');
      });
  };

  const handleDeleteSession = () => {
    if (!confirm('Are you sure you want to delete this session? This cannot be undone.')) return;
    // Optimistic: navigate immediately, fire DELETE in background
    router.push('/dashboard/voice-storm');

    fetch(`/api/voice-storming/${id}`, { method: 'DELETE' }).catch(() => {
      // No revert — user can navigate back if needed
    });
  };

  // Filtered ideas for the link dropdown
  const filteredLinkIdeas = linkSearch
    ? allIdeas.filter((idea) => idea.title.toLowerCase().includes(linkSearch.toLowerCase()))
    : allIdeas.slice(0, 5);

  // Loading state
  if (loading) {
    return (
      <PageWrapper>
        <div className="space-y-6 animate-pulse">
          <div className="h-6 w-32 rounded bg-[var(--color-border)]" />
          <div className="h-10 w-2/3 rounded bg-[var(--color-border)]" />
          <div className="h-48 w-full rounded bg-[var(--color-border)]" />
        </div>
      </PageWrapper>
    );
  }

  // Error state
  if (error || !session) {
    return (
      <PageWrapper>
        <div className="text-center py-20">
          <p className="text-[var(--color-text)] mb-4">Session not found.</p>
          <Link
            href="/dashboard/voice-storm"
            className="text-[var(--color-accent)] hover:underline"
          >
            Back to Voice Storm
          </Link>
        </div>
      </PageWrapper>
    );
  }

  const hasInsights = session.extractedInsights.length > 0;
  const hasLinkedIdeas = (session.linkedIdeaIds?.length ?? 0) > 0;

  return (
    <PageWrapper>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text)] shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/dashboard/voice-storm"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-text)] hover:opacity-80 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>

          {/* Action menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg hover:bg-[var(--color-border)] transition-colors text-[var(--color-text)] focus:outline-none"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg py-1">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleProcess();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors focus:outline-none"
                  >
                    Re-process with AI
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleDeleteSession();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[var(--color-border)] transition-colors focus:outline-none"
                  >
                    Delete Session
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        {editingTitle ? (
          <input
            data-transparent=""
            style={{ backgroundColor: 'transparent' }}
            autoFocus
            className="text-2xl font-semibold bg-transparent border-b border-[var(--color-border)] text-[var(--color-text)] w-full pb-1 mb-2 focus:outline-none"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => handleSaveTitle(titleDraft)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle(titleDraft);
              if (e.key === 'Escape') setEditingTitle(false);
            }}
          />
        ) : (
          <h2
            className="text-2xl font-semibold text-[var(--color-text)] cursor-pointer hover:opacity-80 transition-opacity mb-2"
            onClick={() => {
              setTitleDraft(session.title || '');
              setEditingTitle(true);
            }}
            title="Click to edit title"
          >
            {session.title || 'Untitled Session'}
          </h2>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-[var(--color-text-muted)]">
            {new Date(session.createdAt).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>

          {session.duration > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-light)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-accent)]">
              {formatDuration(session.duration)}
            </span>
          )}

          {/* Linked ideas pills + link button */}
          <div className="relative inline-flex items-center gap-1.5 flex-wrap" ref={linkDropdownRef}>
            {linkedIdeas.map((idea) => (
              <span
                key={idea._id}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-light)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-accent)]"
              >
                {idea.title}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveLinkedIdea(idea._id);
                  }}
                  className="ml-0.5 hover:text-[var(--color-text)] transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}

            {!hasLinkedIdeas ? (
              <button
                onClick={handleOpenLinkDropdown}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-border)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Link to idea
              </button>
            ) : (
              <button
                onClick={handleOpenLinkDropdown}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-light)] px-2 py-0.5 text-xs font-medium text-[var(--color-accent)] hover:opacity-80 transition-opacity"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            )}

            {/* Link ideas dropdown */}
            {linkDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 w-72 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg">
                <div className="p-2 border-b border-[var(--color-border)]">
                  <input
                    type="text"
                    value={linkSearch}
                    onChange={(e) => setLinkSearch(e.target.value)}
                    placeholder="Search ideas..."
                    autoFocus
                    className="w-full p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {loadingIdeas ? (
                    <div className="px-3 py-3 text-sm text-[var(--color-text-muted)] text-center">Loading ideas...</div>
                  ) : filteredLinkIdeas.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-[var(--color-text-muted)] text-center">
                      {linkSearch ? 'No matching ideas found.' : 'No approved ideas yet.'}
                    </div>
                  ) : (
                    filteredLinkIdeas.map((idea) => {
                      const isLinked = session.linkedIdeaIds?.includes(idea._id) ?? false;
                      return (
                        <button
                          key={idea._id}
                          onClick={() => handleToggleLinkedIdea(idea._id)}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2.5 ${
                            isLinked
                              ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                              : 'text-[var(--color-text)] hover:bg-[var(--color-bg)]'
                          }`}
                        >
                          <span
                            className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isLinked
                                ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                                : 'border-[var(--color-border)]'
                            }`}
                          >
                            {isLinked && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          <span className="truncate">{idea.title}</span>
                        </button>
                      );
                    })
                  )}
                  {!linkSearch && allIdeas.length > 5 && (
                    <div className="px-3 py-1.5 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
                      Type to search {allIdeas.length - 5} more...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transcript Card */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-[var(--color-text)]">Transcript</h3>
          {!editingTranscript ? (
            <button
              onClick={() => {
                setTranscriptDraft(session.transcript);
                setEditingTranscript(true);
              }}
              className="text-sm text-[var(--color-accent)] hover:underline focus:outline-none"
            >
              Edit
            </button>
          ) : null}
        </div>

        {session.promptUsed && (
          <div className="rounded-lg bg-[var(--color-accent-light)] px-4 py-3 mb-4">
            <p className="text-sm italic text-[var(--color-text)]">{session.promptUsed}</p>
          </div>
        )}

        {editingTranscript ? (
          <div>
            <VoiceInputWrapper onTranscript={(text) => setTranscriptDraft((prev) => prev ? prev + '\n' + text : text)}>
            <textarea
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-sm text-[var(--color-text)] resize-y min-h-[200px] focus:outline-none"
              rows={12}
              value={transcriptDraft}
              onChange={(e) => setTranscriptDraft(e.target.value)}
            />
            </VoiceInputWrapper>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => handleSaveTranscript(transcriptDraft)}
                className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg-dark)] hover:opacity-90 transition-opacity focus:outline-none"
              >
                Save
              </button>
              <button
                onClick={() => setEditingTranscript(false)}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors focus:outline-none"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">
            {session.transcript}
          </p>
        )}
      </div>

      {/* Extracted Insights */}
      {hasInsights && (
        <div className="space-y-8 mb-8">
          {INSIGHT_SECTIONS.map((section) => {
            const insights = session.extractedInsights.filter((i) => i.type === section.type);
            if (insights.length === 0) return null;
            return (
              <div key={section.type}>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-lg font-medium text-[var(--color-text)]">{section.label}</h3>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${section.badge}`}>
                    {insights.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {insights.map((insight) => (
                    <div
                      key={insight._id}
                      className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 border-l-4 ${section.border}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--color-text)] leading-relaxed">{insight.content}</p>
                          {insight.contentPillar && (
                            <span className="inline-block mt-2 rounded-full bg-[var(--color-border)] px-2.5 py-0.5 text-xs text-[var(--color-text-muted)]">
                              {insight.contentPillar}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {section.type === 'idea' && (
                            pushedInsightIds.has(insight._id) ? (
                              <span className="rounded-lg bg-emerald-900 px-3 py-1.5 text-xs font-medium text-emerald-300">
                                Pushed
                              </span>
                            ) : (
                              <button
                                onClick={() => handlePushIdea(insight._id)}
                                className="rounded-lg bg-[var(--color-accent-light)] px-3 py-1.5 text-xs font-medium text-[var(--color-accent)] hover:opacity-80 transition-opacity focus:outline-none"
                              >
                                Push to Ideas
                              </button>
                            )
                          )}
                          <button
                            onClick={() => handleDeleteInsight(insight._id)}
                            className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:text-red-400 hover:bg-[var(--color-bg-secondary)] transition-colors focus:outline-none"
                            title="Delete insight"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Unprocessed State */}
      {!hasInsights && !processing && (
        <div className="rounded-xl border-2 border-dashed border-[var(--color-border)] p-10 text-center mb-8">
          <p className="text-[var(--color-text)] mb-4">
            This session hasn&apos;t been processed yet. Let AI extract ideas, stories, themes, and action items.
          </p>
          <button
            onClick={handleProcess}
            className="rounded-lg bg-[var(--color-accent)] px-6 py-2.5 text-sm font-medium text-[var(--color-bg-dark)] hover:opacity-90 transition-opacity focus:outline-none"
          >
            Process with AI
          </button>
        </div>
      )}

      {/* Processing State */}
      {processing && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center mb-8">
          <div className="inline-block w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-[var(--color-text)]">
            Extracting ideas, stories, and themes from your session...
          </p>
        </div>
      )}
    </PageWrapper>
  );
}
