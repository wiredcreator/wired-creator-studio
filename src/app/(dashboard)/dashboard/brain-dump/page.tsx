'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

interface ExtractedData {
  contentIdeas: {
    title: string;
    description: string;
    contentPillar: string;
    angle: string;
  }[];
  stories: {
    summary: string;
    fullText: string;
  }[];
  insights: {
    content: string;
    tags: string[];
  }[];
  themes: {
    theme: string;
    contentPillar: string;
    occurrences: number;
  }[];
}

type Priority = 'high' | 'medium' | 'low';
type SortOption = 'newest' | 'oldest' | 'priority';

type InputType = 'written' | 'voice' | 'file_upload';

interface Session {
  _id: string;
  callType: string;
  inputType?: InputType;
  transcript: string;
  extractedIdeas: { title: string; description: string }[];
  extractedStories: { summary: string; fullText: string }[];
  extractedThemes: string[];
  ingestedIntoBrandBrain: boolean;
  callDate: string;
  createdAt: string;
  priority: Priority;
  tags: string[];
}

type View =
  | { type: 'form' }
  | { type: 'detail'; session: Session }
  | { type: 'detail-new'; sessionId: string; transcript: string; data: ExtractedData };

const PRIORITY_COLORS: Record<Priority, { bg: string; text: string }> = {
  high: { bg: 'var(--color-error)', text: '#FFFFFF' },
  medium: { bg: 'var(--color-accent)', text: '#FFFFFF' },
  low: { bg: 'var(--color-bg-elevated)', text: 'var(--color-text-primary)' },
};

const INPUT_TYPE_LABELS: Record<InputType, string> = {
  voice: 'Voice Recording',
  written: 'Written',
  file_upload: 'File Upload',
};

const INPUT_TYPE_COLORS: Record<InputType, { bg: string; text: string }> = {
  voice: { bg: '#059669', text: '#FFFFFF' },
  written: { bg: '#3B82F6', text: '#FFFFFF' },
  file_upload: { bg: '#D97706', text: '#FFFFFF' },
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function BrainDumpPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [view, setView] = useState<View>({ type: 'form' });
  const [listMode, setListMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterTag, setFilterTag] = useState<string>('');
  const [sessionToDelete, setSessionToDelete] = useState<{id: string, title: string} | null>(null);

  // Form state
  const [text, setText] = useState('');
  const [lastInputMethod, setLastInputMethod] = useState<'written' | 'voice' | 'file_upload'>('written');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Detail view editing state
  const [editTranscript, setEditTranscript] = useState('');
  const [isSavingTranscript, setIsSavingTranscript] = useState(false);
  const [transcriptSaveSuccess, setTranscriptSaveSuccess] = useState(false);
  const [savingIdeaIndex, setSavingIdeaIndex] = useState<number | null>(null);
  const [savedIdeaIndices, setSavedIdeaIndices] = useState<Set<number>>(new Set());

  // Tag input state (detail view)
  const [tagInput, setTagInput] = useState('');
  const [detailTags, setDetailTags] = useState<string[]>([]);

  // Priority state (detail view)
  const [detailPriority, setDetailPriority] = useState<Priority>('medium');

  // Extract more state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extraIdeas, setExtraIdeas] = useState<{ title: string; description: string }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  const fetchSessions = useCallback(async () => {
    if (!userId) {
      setIsLoadingSessions(false);
      return;
    }

    try {
      const params = new URLSearchParams({ sort: sortBy });
      const res = await fetch(`/api/brain-dump?userId=${userId}&${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.data || data.sessions || []);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoadingSessions(false);
    }
  }, [userId, sortBy]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Collect all unique tags from sessions for the filter dropdown
  const allTags = Array.from(new Set(sessions.flatMap((s) => s.tags || []))).sort();

  // Reset filter if the selected tag no longer exists
  useEffect(() => {
    if (filterTag && !allTags.includes(filterTag)) {
      setFilterTag('');
    }
  }, [allTags, filterTag]);

  // Client-side tag filtering
  const filteredSessions = filterTag
    ? sessions.filter((s) => (s.tags || []).includes(filterTag))
    : sessions;

  // ─── Recording ──────────────────────────────────────────────────────

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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
              setText((prev) => (prev ? prev + '\n\n' + data.text : data.text));
              setLastInputMethod('voice');
            }
          } else {
            setError('Failed to transcribe audio. Please try again.');
          }
        } catch {
          setError('Failed to transcribe audio. Please try again.');
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
      setError('Could not access microphone. Please allow microphone access or paste your content manually.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // ─── File Attach ────────────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }

    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload a .txt, .pdf, or .doc/.docx file.');
      return;
    }

    if (file.type === 'text/plain') {
      const fileText = await file.text();
      setText((prev) => (prev ? prev + '\n\n' + fileText : fileText));
      setAttachedFile(file);
    } else {
      setAttachedFile(file);
    }
    setLastInputMethod('file_upload');

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Submit ─────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!text.trim() && !attachedFile) {
      setError('Please enter some content before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/brain-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text.trim(),
          userId,
          callType: 'brain_dump',
          inputType: lastInputMethod,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to process brain dump');
      }

      const data = await res.json();
      const transcript = text.trim();
      setText('');
      setAttachedFile(null);
      setLastInputMethod('written');
      setRecordingTime(0);
      fetchSessions();

      // Navigate to detail view for the new result
      setView({
        type: 'detail-new',
        sessionId: data.session._id,
        transcript,
        data: data.extracted,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      const previousSessions = sessions;
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));

      // If viewing the deleted session, go back to form
      if (
        (view.type === 'detail' && view.session._id === sessionId) ||
        (view.type === 'detail-new' && view.sessionId === sessionId)
      ) {
        setView({ type: 'form' });
      }

      fetch(`/api/brain-dump/${sessionId}`, { method: 'DELETE' })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to delete session');
        })
        .catch((err) => {
          console.error('Error deleting session:', err);
          setSessions(previousSessions);
          setError('Failed to delete session. Please try again.');
        });
    },
    [sessions, view]
  );

  // ─── Detail view helpers ────────────────────────────────────────────

  const openSession = (session: Session) => {
    setEditTranscript(session.transcript);
    setTranscriptSaveSuccess(false);
    setSavedIdeaIndices(new Set());
    setDetailTags(session.tags || []);
    setDetailPriority(session.priority || 'medium');
    setTagInput('');
    setExtraIdeas([]);
    setView({ type: 'detail', session });
  };

  const handleSaveTranscript = async () => {
    const sessionId = view.type === 'detail' ? view.session._id : view.type === 'detail-new' ? view.sessionId : null;
    if (!sessionId) return;

    setIsSavingTranscript(true);
    setTranscriptSaveSuccess(false);

    try {
      const res = await fetch(`/api/brain-dump/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: editTranscript }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setTranscriptSaveSuccess(true);
      setTimeout(() => setTranscriptSaveSuccess(false), 2500);
    } catch {
      setError('Failed to save transcript changes.');
    } finally {
      setIsSavingTranscript(false);
    }
  };

  const handleSaveIdea = async (idea: { title: string; description: string }, index: number) => {
    setSavingIdeaIndex(index);
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: idea.title,
          description: idea.description,
          source: 'brain_dump',
          status: 'suggested',
        }),
      });
      if (!res.ok) throw new Error('Failed to save idea');
      setSavedIdeaIndices((prev) => new Set(prev).add(index));
    } catch {
      setError('Failed to save idea. Please try again.');
    } finally {
      setSavingIdeaIndex(null);
    }
  };

  // ─── Priority update ────────────────────────────────────────────────

  const handlePriorityChange = async (newPriority: Priority) => {
    const sessionId = view.type === 'detail' ? view.session._id : view.type === 'detail-new' ? view.sessionId : null;
    if (!sessionId) return;

    const oldPriority = detailPriority;
    setDetailPriority(newPriority);

    try {
      const res = await fetch(`/api/brain-dump/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (!res.ok) throw new Error('Failed');
      // Update session in the list too
      setSessions((prev) =>
        prev.map((s) => (s._id === sessionId ? { ...s, priority: newPriority } : s))
      );
    } catch {
      setDetailPriority(oldPriority);
      setError('Failed to update priority.');
    }
  };

  // ─── Tag management ─────────────────────────────────────────────────

  const persistTags = async (sessionId: string, tags: string[]) => {
    try {
      const res = await fetch(`/api/brain-dump/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      });
      if (!res.ok) throw new Error('Failed');
      setSessions((prev) =>
        prev.map((s) => (s._id === sessionId ? { ...s, tags } : s))
      );
    } catch {
      setError('Failed to update tags.');
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || detailTags.includes(tag)) {
      setTagInput('');
      return;
    }
    const sessionId = view.type === 'detail' ? view.session._id : view.type === 'detail-new' ? view.sessionId : null;
    if (!sessionId) return;

    const newTags = [...detailTags, tag];
    setDetailTags(newTags);
    setTagInput('');
    persistTags(sessionId, newTags);
  };

  const handleRemoveTag = (tag: string) => {
    const sessionId = view.type === 'detail' ? view.session._id : view.type === 'detail-new' ? view.sessionId : null;
    if (!sessionId) return;

    const newTags = detailTags.filter((t) => t !== tag);
    setDetailTags(newTags);
    persistTags(sessionId, newTags);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // ─── Extract More ───────────────────────────────────────────────────

  const handleExtractMore = async () => {
    const sessionId = view.type === 'detail' ? view.session._id : view.type === 'detail-new' ? view.sessionId : null;
    if (!sessionId) return;

    setIsExtracting(true);
    setError('');

    try {
      const res = await fetch(`/api/brain-dump/${sessionId}/extract-more`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to extract more ideas');
      }

      const data = await res.json();
      const newIdeas = data.newIdeas.map((i: { title: string; description: string }) => ({
        title: i.title,
        description: i.description,
      }));
      setExtraIdeas((prev) => [...prev, ...newIdeas]);

      // Update the session in state so the ideas list updates if they go back/forth
      if (view.type === 'detail') {
        const updatedSession = {
          ...view.session,
          extractedIdeas: [...view.session.extractedIdeas, ...newIdeas],
          extractedThemes: data.session.extractedThemes || view.session.extractedThemes,
        };
        setView({ type: 'detail', session: updatedSession });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract more ideas.');
    } finally {
      setIsExtracting(false);
    }
  };

  const canSubmit = (text.trim() || attachedFile) && !isSubmitting && !isTranscribing;

  // ─── Detail View ────────────────────────────────────────────────────

  if (view.type === 'detail' || view.type === 'detail-new') {
    const transcript = view.type === 'detail' ? view.session.transcript : view.transcript;
    const ideas =
      view.type === 'detail'
        ? view.session.extractedIdeas
        : view.data.contentIdeas.map((i) => ({ title: i.title, description: i.description }));
    const sessionDate =
      view.type === 'detail'
        ? new Date(view.session.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });
    const sessionTitle =
      view.type === 'detail' && view.session.extractedIdeas.length > 0
        ? `Brain Dump: ${view.session.extractedIdeas[0].title}`
        : view.type === 'detail-new' && view.data.contentIdeas.length > 0
          ? `Brain Dump: ${view.data.contentIdeas[0].title}`
          : 'Brain Dump Session';

    // Initialize editTranscript when entering detail-new view
    if (view.type === 'detail-new' && editTranscript !== transcript) {
      setEditTranscript(transcript);
    }

    // Initialize detail state for new sessions
    if (view.type === 'detail-new' && detailTags.length === 0 && detailPriority === 'medium' && extraIdeas.length === 0) {
      // Already defaults
    }

    const themes =
      view.type === 'detail'
        ? view.session.extractedThemes
        : view.data.themes.map((t) => t.theme);

    const themeDetails =
      view.type === 'detail-new'
        ? view.data.themes
        : null;

    return (
      <div className="flex flex-col min-h-full">
        {/* Back button */}
        <div className="px-6 py-4 sm:px-10">
          <button
            onClick={() => setView({ type: 'form' })}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back
          </button>
        </div>

        {/* Title & Date & Priority */}
        <div className="px-6 sm:px-10 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="font-heading text-2xl font-semibold text-[var(--color-text-primary)] leading-tight">
                {sessionTitle}
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{sessionDate}</p>
            </div>

            {/* Priority pills */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs text-[var(--color-text-secondary)] mr-1">Priority</span>
              {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePriorityChange(p)}
                  className="px-3 py-1 text-xs font-medium rounded-[var(--radius-full)] transition-all outline-none ring-0 capitalize"
                  style={{
                    backgroundColor:
                      detailPriority === p ? PRIORITY_COLORS[p].bg : 'var(--color-bg-secondary)',
                    color:
                      detailPriority === p ? PRIORITY_COLORS[p].text : 'var(--color-text-secondary)',
                    border:
                      detailPriority === p ? 'none' : '1px solid var(--color-border)',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Theme badges */}
          {themes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {themes.map((theme, i) => {
                const detail = themeDetails?.[i];
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-[var(--radius-full)] bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                    title={detail ? `Pillar: ${detail.contentPillar} | Occurrences: ${detail.occurrences}` : undefined}
                  >
                    {theme}
                    {detail && (
                      <span className="text-[10px] opacity-70">({detail.contentPillar})</span>
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {/* Tags */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {detailTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-[var(--radius-full)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-0.5 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors outline-none ring-0"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add tag..."
              className="px-2.5 py-1 text-xs rounded-[var(--radius-full)] bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none ring-0 w-24"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 sm:mx-10 mb-4 rounded-[var(--radius-md)] bg-[var(--color-error-light)] border border-[var(--color-error)] px-4 py-3">
            <p className="text-sm text-[var(--color-error)]">{error}</p>
          </div>
        )}

        {/* Side-by-side layout */}
        <div className="flex-1 px-6 sm:px-10 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT — Transcript */}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
                Transcript
              </h2>
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
                <textarea
                  data-transparent=""
                  style={{ backgroundColor: 'transparent' }}
                  value={editTranscript}
                  onChange={(e) => setEditTranscript(e.target.value)}
                  className="w-full min-h-[300px] bg-transparent text-sm text-[var(--color-text-primary)] leading-relaxed resize-y focus:outline-none focus:ring-0 border-none p-0"
                />
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={handleSaveTranscript}
                    disabled={isSavingTranscript}
                    className="px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors disabled:opacity-50"
                  >
                    {isSavingTranscript ? 'Saving...' : 'Save changes'}
                  </button>
                  {transcriptSaveSuccess && (
                    <span className="text-sm text-[var(--color-success)]">Saved</span>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT — Content Ideas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Content Ideas
                </h2>
                <button
                  onClick={handleExtractMore}
                  disabled={isExtracting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 outline-none ring-0"
                >
                  {isExtracting ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                      </svg>
                      Extracting...
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                      </svg>
                      Extract More Ideas
                    </>
                  )}
                </button>
              </div>
              {ideas.length > 0 || extraIdeas.length > 0 ? (
                <div className="space-y-3">
                  {ideas.map((idea, i) => (
                    <div
                      key={`orig-${i}`}
                      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4"
                    >
                      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug">
                        {idea.title}
                      </h3>
                      <p className="mt-1.5 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                        {idea.description}
                      </p>
                      <div className="mt-3">
                        {savedIdeaIndices.has(i) ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[var(--color-success)]">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            Saved
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSaveIdea(idea, i)}
                            disabled={savingIdeaIndex === i}
                            className="px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 outline-none ring-0"
                          >
                            {savingIdeaIndex === i ? 'Saving...' : 'Save Idea'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Extra ideas from "Extract More" */}
                  {extraIdeas.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 pt-2">
                        <div className="flex-1 h-px bg-[var(--color-border)]" />
                        <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
                          Newly extracted
                        </span>
                        <div className="flex-1 h-px bg-[var(--color-border)]" />
                      </div>
                      {extraIdeas.map((idea, i) => {
                        const globalIdx = ideas.length + i;
                        return (
                          <div
                            key={`extra-${i}`}
                            className="rounded-[var(--radius-md)] border border-[var(--color-accent)] bg-[var(--color-bg-card)] p-4"
                          >
                            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug">
                              {idea.title}
                            </h3>
                            <p className="mt-1.5 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                              {idea.description}
                            </p>
                            <div className="mt-3">
                              {savedIdeaIndices.has(globalIdx) ? (
                                <span className="inline-flex items-center gap-1 text-xs text-[var(--color-success)]">
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                  Saved
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleSaveIdea(idea, globalIdx)}
                                  disabled={savingIdeaIndex === globalIdx}
                                  className="px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 outline-none ring-0"
                                >
                                  {savingIdeaIndex === globalIdx ? 'Saving...' : 'Save Idea'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              ) : (
                <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 text-center">
                  <p className="text-sm text-[var(--color-text-secondary)]">No content ideas extracted.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Form View (default) ────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-6 py-8 sm:px-10">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Brain Dump Session
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
          Press record, write or upload a file to extract your scattered ideas
        </p>
      </div>

      {/* Form area */}
      <div className="px-6 sm:px-10 pb-6">
        <div className="max-w-4xl">
          {/* Error */}
          {error && (
            <div className="mb-4 rounded-[var(--radius-md)] bg-[var(--color-error-light)] border border-[var(--color-error)] px-4 py-3">
              <p className="text-sm text-[var(--color-error)]">{error}</p>
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[var(--color-text-primary)]">Recording: {formatTime(recordingTime)}</span>
              <button
                onClick={stopRecording}
                className="ml-auto text-xs text-[var(--color-error)] hover:underline"
              >
                Stop Recording
              </button>
            </div>
          )}

          {/* Transcribing indicator */}
          {isTranscribing && (
            <div className="mb-3 flex items-center gap-2 text-sm text-[var(--color-accent)]">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Transcribing audio...
            </div>
          )}

          {/* Large textarea */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden">
            <textarea
              data-transparent=""
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's on your mind? Press record, paste a transcript, upload a file or just start typing..."
              rows={8}
              className="w-full resize-none bg-transparent px-5 py-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-0 border-none"
              style={{ minHeight: '200px', backgroundColor: 'transparent' }}
            />

            {/* Attached file indicator inside textarea area */}
            {attachedFile && (
              <div className="mx-4 mb-3 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-3 py-2">
                <svg className="h-4 w-4 text-[var(--color-accent)] flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                </svg>
                <span className="text-sm text-[var(--color-text-primary)] truncate flex-1">{attachedFile.name}</span>
                <button
                  onClick={removeFile}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors flex-shrink-0"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Button row below textarea */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
              {/* Left: Record + Attach */}
              <div className="flex items-center gap-2">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isSubmitting || isTranscribing}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                    fontSize: 14, fontWeight: 500, borderRadius: 10, cursor: 'pointer',
                    transition: 'all 0.2s',
                    ...(isRecording
                      ? { backgroundColor: '#EF4444', color: '#FFFFFF', border: 'none' }
                      : { backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }),
                  }}
                >
                  {isRecording ? (
                    <>
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                      Stop
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                      </svg>
                      Record
                    </>
                  )}
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting || isRecording}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                    fontSize: 14, fontWeight: 500, borderRadius: 10, cursor: 'pointer',
                    backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)',
                    transition: 'all 0.2s',
                  }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                  </svg>
                  Attach
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Right: Submit */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 24px',
                  fontSize: 14, fontWeight: 600, borderRadius: 10, cursor: canSubmit ? 'pointer' : 'not-allowed',
                  backgroundColor: 'var(--color-accent)', color: '#FFFFFF', border: 'none',
                  opacity: canSubmit ? 1 : 0.4, transition: 'all 0.2s',
                }}
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Previously saved sessions */}
      <div className="px-6 sm:px-10 pb-10 flex-1">
        <div className="max-w-6xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Previously saved sessions
            </h2>
            <div className="flex items-center gap-3">
              {/* Sort dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-xs rounded-[var(--radius-md)] bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-2.5 py-1.5 outline-none ring-0 cursor-pointer"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="priority">Priority</option>
              </select>

              {/* Tag filter dropdown */}
              {allTags.length > 0 && (
                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="text-xs rounded-[var(--radius-md)] bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-2.5 py-1.5 outline-none ring-0 cursor-pointer"
                >
                  <option value="">All tags</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-1">
                {/* Grid view button */}
                <button
                  onClick={() => setListMode('grid')}
                  className="p-1.5 rounded-[var(--radius-md)] outline-none ring-0 transition-colors"
                  style={{
                    color: listMode === 'grid' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  }}
                  title="Grid view"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                  </svg>
                </button>
                {/* List view button */}
                <button
                  onClick={() => setListMode('list')}
                  className="p-1.5 rounded-[var(--radius-md)] outline-none ring-0 transition-colors"
                  style={{
                    color: listMode === 'list' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  }}
                  title="List view"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {isLoadingSessions && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] py-8">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
              Loading sessions...
            </div>
          )}

          {!isLoadingSessions && filteredSessions.length === 0 && (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">
                {filterTag
                  ? `No sessions with tag "${filterTag}".`
                  : 'No sessions yet. Submit your first brain dump above to get started.'}
              </p>
            </div>
          )}

          {!isLoadingSessions && filteredSessions.length > 0 && (
            <div className={listMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' : 'flex flex-col gap-3'}>
              {filteredSessions.map((session) => {
                const date = new Date(session.callDate || session.createdAt);
                const formattedDate = date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const transcriptSnippet =
                  session.transcript.length > 120
                    ? session.transcript.slice(0, 120) + '...'
                    : session.transcript;
                const title =
                  session.extractedIdeas.length > 0
                    ? session.extractedIdeas[0].title
                    : 'Brain Dump Session';
                const ideasCount = session.extractedIdeas?.length || 0;
                const pillar =
                  session.extractedThemes.length > 0 ? session.extractedThemes[0] : null;
                const priority = session.priority || 'medium';
                const tags = session.tags || [];
                const wordCount = countWords(session.transcript);
                const sessionInputType: InputType = session.inputType || 'written';

                if (listMode === 'list') {
                  return (
                    <div
                      key={session._id}
                      onClick={() => openSession(session)}
                      className="group rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 cursor-pointer transition-all hover:border-[var(--color-accent)] hover:shadow-[var(--shadow-md)]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-[var(--radius-sm)] flex-shrink-0"
                              style={{
                                backgroundColor: INPUT_TYPE_COLORS[sessionInputType].bg,
                                color: INPUT_TYPE_COLORS[sessionInputType].text,
                              }}
                            >
                              {INPUT_TYPE_LABELS[sessionInputType]}
                            </span>
                            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug truncate">
                              {title}
                            </h3>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-[var(--radius-full)]"
                                style={{
                                  backgroundColor: PRIORITY_COLORS[priority].bg,
                                  color: PRIORITY_COLORS[priority].text,
                                }}
                              >
                                {priority}
                              </span>
                              {pillar && (
                                <span className="text-[11px] text-white bg-[var(--color-accent)] px-2 py-0.5 rounded-[var(--radius-full)]">
                                  Pillar: {pillar}
                                </span>
                              )}
                              <span className="text-[11px] text-[var(--color-text-muted)]">
                                {wordCount} words
                              </span>
                              {ideasCount > 0 && (
                                <span className="text-[11px] text-[var(--color-text-muted)]">
                                  {ideasCount} idea{ideasCount !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed truncate mt-1">
                            {transcriptSnippet}
                          </p>
                          {tags.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              {tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] text-[var(--color-text-primary)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-1.5 py-0.5 rounded-[var(--radius-full)]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSessionToDelete({
                              id: session._id,
                              title: session.transcript.slice(0, 50) || 'this session',
                            });
                          }}
                          className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete session"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={session._id}
                    onClick={() => openSession(session)}
                    className="group rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 cursor-pointer transition-all hover:border-[var(--color-accent)] hover:shadow-[var(--shadow-md)] flex flex-col"
                  >
                    {/* Input type badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-[var(--radius-md)]"
                        style={{
                          backgroundColor: INPUT_TYPE_COLORS[sessionInputType].bg,
                          color: INPUT_TYPE_COLORS[sessionInputType].text,
                        }}
                      >
                        {INPUT_TYPE_LABELS[sessionInputType]}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionToDelete({
                            id: session._id,
                            title: session.transcript.slice(0, 50) || 'this session',
                          });
                        }}
                        className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete session"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2 mb-1">
                      {title}
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-3 mb-3 flex-1">
                      {transcriptSnippet}
                    </p>
                    {/* Bottom metadata row: priority, pillar, word count */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-[var(--radius-full)]"
                        style={{
                          backgroundColor: PRIORITY_COLORS[priority].bg,
                          color: PRIORITY_COLORS[priority].text,
                        }}
                      >
                        {priority}
                      </span>
                      {pillar && (
                        <span className="text-[11px] text-white bg-[var(--color-accent)] px-2 py-0.5 rounded-[var(--radius-full)]">
                          Pillar: {pillar}
                        </span>
                      )}
                      <span className="text-[11px] text-[var(--color-text-muted)] ml-auto">
                        {wordCount} words
                      </span>
                      {ideasCount > 0 && (
                        <span className="text-[11px] text-[var(--color-text-muted)]">
                          {ideasCount} idea{ideasCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {sessionToDelete && (
        <ConfirmDeleteModal
          itemType="session"
          itemName={sessionToDelete.title}
          onConfirm={() => { handleDeleteSession(sessionToDelete.id); setSessionToDelete(null); }}
          onCancel={() => setSessionToDelete(null)}
        />
      )}
    </div>
  );
}
