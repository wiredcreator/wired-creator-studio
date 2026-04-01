'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageWrapper from '@/components/PageWrapper';

interface VoiceStormSession {
  _id: string;
  title?: string;
  transcript: string;
  extractedInsights: { _id: string; type: string; content: string; contentPillar: string }[];
  duration: number;
  promptUsed?: string;
  linkedIdeaIds?: string[];
  createdAt: string;
}

interface Idea {
  _id: string;
  title: string;
  status: string;
}

type FilterType = 'all' | 'ideas' | 'stories' | 'themes' | 'action_items' | 'linked';

const INSIGHT_BADGE_CONFIG: Record<string, { label: string; classes: string }> = {
  idea: { label: 'Ideas', classes: 'bg-amber-900 text-amber-300' },
  story: { label: 'Stories', classes: 'bg-purple-900 text-purple-300' },
  theme: { label: 'Themes', classes: 'bg-blue-900 text-blue-300' },
  action_item: { label: 'Action Items', classes: 'bg-emerald-900 text-emerald-300' },
};

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ideas', label: 'Ideas' },
  { value: 'stories', label: 'Stories' },
  { value: 'themes', label: 'Themes' },
  { value: 'action_items', label: 'Action Items' },
  { value: 'linked', label: 'Linked to Idea' },
];

export default function VoiceStormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sessions state
  const [sessions, setSessions] = useState<VoiceStormSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Creation state
  const [transcript, setTranscript] = useState('');
  const [inputExpanded, setInputExpanded] = useState(false);
  const [sessionType, setSessionType] = useState<'general' | 'video_idea'>('general');
  const [linkedIdeaIds, setLinkedIdeaIds] = useState<string[]>([]);
  const [ideaSearch, setIdeaSearch] = useState('');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [saving, setSaving] = useState(false);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [skippedPrompts, setSkippedPrompts] = useState<string[]>([]);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputContainerRef = useRef<HTMLDivElement | null>(null);

  // ─── Data Fetching ────────────────────────────────────────────────────

  const fetchSessions = useCallback(async (search?: string, filter?: FilterType) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filter && filter !== 'all') params.set('filter', filter);
      const qs = params.toString();
      const res = await fetch(`/api/voice-storming${qs ? `?${qs}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPrompts = async () => {
    setLoadingPrompts(true);
    setInputExpanded(true);
    setSkippedPrompts([]);
    try {
      const res = await fetch('/api/voice-storming/prompts');
      if (res.ok) {
        const data = await res.json();
        setPrompts(data.prompts || []);
        setSelectedPrompt(null);
      }
    } catch {
      setPrompts([
        'What happened this week that surprised you?',
        'What question do your viewers keep asking?',
        'What did you learn recently that changed how you work?',
      ]);
      setSelectedPrompt(null);
    } finally {
      setLoadingPrompts(false);
    }
  };

  const skipPrompt = async (index: number) => {
    const skippedPrompt = prompts[index];
    const allSkipped = [...skippedPrompts, skippedPrompt];
    setSkippedPrompts(allSkipped);
    setReplacingIndex(index);

    // Optimistically remove the prompt
    setPrompts((prev) => prev.filter((_, i) => i !== index));
    if (selectedPrompt === skippedPrompt) setSelectedPrompt(null);

    // Fetch a single replacement in the background
    try {
      const excludeAll = [...allSkipped, ...prompts.filter((_, i) => i !== index)];
      const params = new URLSearchParams({ count: '1', exclude: excludeAll.join('||') });
      const res = await fetch(`/api/voice-storming/prompts?${params}`);
      if (res.ok) {
        const data = await res.json();
        const newPrompt = (data.prompts || [])[0];
        if (newPrompt) {
          setPrompts((prev) => [...prev, newPrompt]);
        }
      }
    } catch {
      // Silently fail; user still has remaining prompts
    } finally {
      setReplacingIndex(null);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetch('/api/ideas?status=approved&limit=50')
      .then((r) => r.json())
      .then((d) => {
        setIdeas(d.data || []);
        // If arriving from idea detail page with linkIdea param, pre-link the idea
        const linkIdeaId = searchParams.get('linkIdea');
        if (linkIdeaId) {
          const matchingIdea = (d.data || []).find((i: Idea) => i._id === linkIdeaId);
          if (matchingIdea) {
            setSessionType('video_idea');
            setLinkedIdeaIds([linkIdeaId]);
            setInputExpanded(true);
          }
        }
      })
      .catch(() => {});
  }, [fetchSessions, searchParams]);

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchSessions(searchQuery, activeFilter);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, activeFilter, fetchSessions]);

  // Collapse input when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputContainerRef.current &&
        !inputContainerRef.current.contains(e.target as Node) &&
        !transcript.trim()
      ) {
        setInputExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [transcript]);

  const toggleIdeaLink = (ideaId: string) => {
    setLinkedIdeaIds((prev) => {
      const isSelected = prev.includes(ideaId);
      return isSelected ? prev.filter((id) => id !== ideaId) : [...prev, ideaId];
    });
  };

  // ─── Recording Logic ──────────────────────────────────────────────────

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

        // Transcribe via Whisper
        setTranscribing(true);
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
              setTranscript((prev) => prev ? prev + '\n\n' + data.text : data.text);
            }
          }
        } catch (err) {
          console.error('Transcription failed:', err);
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      alert('Could not access microphone. Please allow microphone access or paste your transcript manually.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ─── Submit ───────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!transcript.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/voice-storming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript.trim(),
          sessionType: sessionType === 'video_idea' ? 'idea_specific' : 'freeform',
          linkedIdeaIds: sessionType === 'video_idea' && linkedIdeaIds.length > 0 ? linkedIdeaIds : undefined,
          duration: recordingTime,
          promptUsed: selectedPrompt || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newId = data._id ?? data.data?._id;
        if (newId) {
          // Process in background, then navigate
          fetch(`/api/voice-storming/${newId}/process`, { method: 'POST' }).catch(() => {});
          router.push(`/dashboard/voice-storm/${newId}`);
        }
      }
    } catch (err) {
      console.error('Failed to save session:', err);
    } finally {
      setSaving(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────

  const getSessionTitle = (session: VoiceStormSession) => {
    if (session.title) return session.title;
    const words = session.transcript.split(/\s+/).slice(0, 8).join(' ');
    return words + (session.transcript.split(/\s+/).length > 8 ? '...' : '');
  };

  const getInsightCounts = (session: VoiceStormSession) => {
    const counts: Record<string, number> = {};
    for (const insight of session.extractedInsights ?? []) {
      counts[insight.type] = (counts[insight.type] || 0) + 1;
    }
    return counts;
  };

  const filteredIdeas = ideas.filter((idea) =>
    idea.title.toLowerCase().includes(ideaSearch.toLowerCase())
  );

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <PageWrapper title="Voice Storm" subtitle="Talk it out. We'll capture and organize your thoughts.">
      <div className="space-y-6">
        {/* ─── Section 1: Creation Bar ─────────────────────────────────── */}
        <div
          ref={inputContainerRef}
          className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5"
        >
          {/* Row 1: Mic + Input + Buttons */}
          <div className="flex items-start gap-3">
            {/* Mic Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex-shrink-0 flex items-center justify-center h-11 w-11 rounded-full transition-all ${
                isRecording
                  ? 'bg-red-500 animate-pulse'
                  : 'bg-[var(--color-accent)] hover:opacity-90'
              }`}
            >
              {isRecording ? (
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              )}
            </button>

            {/* Text Input */}
            <div className="flex-1 min-w-0">
              {inputExpanded ? (
                <textarea
                  ref={textareaRef}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="What's on your mind? Paste a transcript or just start typing..."
                  rows={4}
                  className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] resize-none focus:outline-none focus:border-[var(--color-accent)]"
                  autoFocus
                />
              ) : (
                <input
                  type="text"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  onFocus={() => setInputExpanded(true)}
                  onClick={() => setInputExpanded(true)}
                  placeholder="What's on your mind? Paste a transcript or just start typing..."
                  className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              )}
            </div>

            {/* Buttons */}
            <div className="flex-shrink-0 flex items-center gap-2">
              <button
                onClick={fetchPrompts}
                disabled={loadingPrompts}
                className="px-3 py-2.5 rounded-lg border border-[var(--color-accent)] text-sm text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {loadingPrompts ? 'Loading...' : 'Help Me Start'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || transcribing || !transcript.trim()}
                className="px-4 py-2.5 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg-dark)] text-sm font-medium hover:opacity-90 disabled:bg-[#555] disabled:text-[#999] transition-opacity whitespace-nowrap"
              >
                {saving ? 'Saving...' : 'Save & Process'}
              </button>
            </div>
          </div>

          {/* Recording indicator */}
          {(isRecording || recordingTime > 0) && (
            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              {isRecording && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
              <span>{isRecording ? 'Recording' : 'Recorded'}: {formatTime(recordingTime)}</span>
            </div>
          )}

          {/* Transcribing indicator */}
          {transcribing && (
            <div className="mt-3 flex items-center gap-2 text-sm text-[var(--color-accent)]">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Transcribing audio...
            </div>
          )}

          {/* Row 2: Expanded options */}
          {inputExpanded && (
            <div className="mt-4 space-y-3">
              {/* Session type toggle */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--color-text-muted)]">Type:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSessionType('general')}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      sessionType === 'general'
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                        : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)]'
                    }`}
                  >
                    General Thought
                  </button>
                  <button
                    onClick={() => setSessionType('video_idea')}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      sessionType === 'video_idea'
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                        : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)]'
                    }`}
                  >
                    Video Idea
                  </button>
                </div>
              </div>

              {/* Idea multi-select dropdown when Video Idea selected */}
              {sessionType === 'video_idea' && (
                <div className="relative">
                  <input
                    type="text"
                    value={ideaSearch}
                    onChange={(e) => setIdeaSearch(e.target.value)}
                    placeholder="Type to search or pick from your approved ideas below..."
                    className="w-full p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                  />

                  {/* Selected idea pills */}
                  {linkedIdeaIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {linkedIdeaIds.map((ideaId) => {
                        const idea = ideas.find((i) => i._id === ideaId);
                        if (!idea) return null;
                        return (
                          <span
                            key={ideaId}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                          >
                            {idea.title}
                            <button
                              onClick={() => setLinkedIdeaIds((prev) => prev.filter((id) => id !== ideaId))}
                              className="ml-0.5 hover:text-[var(--color-text)] transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {(() => {
                    const displayIdeas = ideaSearch ? filteredIdeas : ideas.slice(0, 5);
                    if (displayIdeas.length > 0) {
                      return (
                        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg">
                          {!ideaSearch && (
                            <div className="px-3 py-1.5 text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                              Latest approved ideas
                            </div>
                          )}
                          {displayIdeas.map((idea) => {
                            const isChecked = linkedIdeaIds.includes(idea._id);
                            return (
                              <button
                                key={idea._id}
                                onClick={() => toggleIdeaLink(idea._id)}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2.5 ${
                                  isChecked
                                    ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                                    : 'text-[var(--color-text)] hover:bg-[var(--color-bg)]'
                                }`}
                              >
                                <span
                                  className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                    isChecked
                                      ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                                      : 'border-[var(--color-border)]'
                                  }`}
                                >
                                  {isChecked && (
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </span>
                                <span className="truncate">{idea.title}</span>
                              </button>
                            );
                          })}
                          {!ideaSearch && ideas.length > 5 && (
                            <div className="px-3 py-1.5 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
                              Type to search {ideas.length - 5} more...
                            </div>
                          )}
                        </div>
                      );
                    }
                    if (ideaSearch) {
                      return (
                        <div className="absolute z-10 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg px-3 py-2 text-sm text-[var(--color-text-muted)]">
                          No matching ideas found.
                        </div>
                      );
                    }
                    return (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg px-3 py-2 text-sm text-[var(--color-text-muted)]">
                        No approved ideas yet. Generate and approve ideas first.
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Prompt chips */}
              {(prompts.length > 0 || replacingIndex !== null) && (
                <div className="flex flex-col gap-2">
                  {prompts.slice(0, 3).map((prompt, i) => (
                    <div
                      key={prompt}
                      className="flex items-center gap-2 animate-[fadeIn_0.25s_ease-in-out]"
                    >
                      <button
                        onClick={() => {
                          setSelectedPrompt(prompt);
                          setTranscript((prev) => (prev ? prev + '\n\n' + prompt : prompt));
                          textareaRef.current?.focus();
                        }}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors text-left ${
                          selectedPrompt === prompt
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                            : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
                        }`}
                      >
                        {prompt}
                      </button>
                      <button
                        onClick={() => skipPrompt(i)}
                        disabled={replacingIndex !== null}
                        className="flex-shrink-0 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-40"
                        title="Try a different prompt"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {replacingIndex !== null && (
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Finding a new prompt...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Section 2: Search & Filter Bar ──────────────────────────── */}
        <div className="space-y-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sessions..."
            className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text)] placeholder:opacity-50 focus:outline-none focus:border-[var(--color-accent)]"
          />
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActiveFilter(opt.value)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  activeFilter === opt.value
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-bg-dark)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Section 3: Session List ─────────────────────────────────── */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">Loading...</p>
          ) : sessions.length === 0 && !searchQuery && activeFilter === 'all' ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center">
              <p className="text-sm text-[var(--color-text)]">
                No voice storm sessions yet. Record your first one above!
              </p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center">
              <p className="text-sm text-[var(--color-text)]">
                No sessions match your search.
              </p>
            </div>
          ) : (
            sessions.map((session) => {
              const insightCounts = getInsightCounts(session);
              const hasInsights = (session.extractedInsights ?? []).length > 0;
              const linkedCount = session.linkedIdeaIds?.length ?? 0;

              return (
                <div
                  key={session._id}
                  onClick={() => router.push(`/dashboard/voice-storm/${session._id}`)}
                  className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 cursor-pointer hover:border-[var(--color-accent)] transition-colors"
                >
                  {/* Title + Date */}
                  <div className="flex items-start justify-between gap-4 mb-1.5">
                    <h3 className="text-sm font-semibold text-[var(--color-text)] line-clamp-1">
                      {getSessionTitle(session)}
                    </h3>
                    <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap flex-shrink-0">
                      {new Date(session.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Transcript preview */}
                  <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mb-3">
                    {session.transcript}
                  </p>

                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-2">
                    {Object.entries(insightCounts).map(([type, count]) => {
                      const config = INSIGHT_BADGE_CONFIG[type];
                      if (!config) return null;
                      return (
                        <span
                          key={type}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.classes}`}
                        >
                          {count} {config.label}
                        </span>
                      );
                    })}

                    {linkedCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                        {linkedCount === 1 ? 'Linked' : `${linkedCount} ideas linked`}
                      </span>
                    )}

                    {!hasInsights && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-900 border border-amber-700 text-amber-300">
                        Unprocessed
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
