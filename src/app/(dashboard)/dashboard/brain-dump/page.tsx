'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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

interface Session {
  _id: string;
  callType: string;
  transcript: string;
  extractedIdeas: { title: string; description: string }[];
  extractedStories: { summary: string; fullText: string }[];
  extractedThemes: string[];
  ingestedIntoBrandBrain: boolean;
  callDate: string;
  createdAt: string;
}

type View =
  | { type: 'form' }
  | { type: 'detail'; session: Session }
  | { type: 'detail-new'; sessionId: string; transcript: string; data: ExtractedData };

export default function BrainDumpPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [view, setView] = useState<View>({ type: 'form' });

  // Form state
  const [text, setText] = useState('');
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
      const res = await fetch(`/api/brain-dump?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.data || data.sessions || []);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoadingSessions(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

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

        {/* Title & Date */}
        <div className="px-6 sm:px-10 pb-6">
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] leading-tight">
            {sessionTitle}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{sessionDate}</p>
        </div>

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
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
                Content Ideas
              </h2>
              {ideas.length > 0 ? (
                <div className="space-y-3">
                  {ideas.map((idea, i) => (
                    <div
                      key={i}
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
                            className="px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--color-bg-dark)] hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
                          >
                            {savingIdeaIndex === i ? 'Saving...' : 'Save Idea'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
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
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
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
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's on your mind? Press record, paste a transcript, upload a file or just start typing..."
              rows={8}
              className="w-full resize-none bg-transparent px-5 py-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-0 border-none"
              style={{ minHeight: '200px' }}
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
        <div className="max-w-4xl">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Previously saved sessions
          </h2>

          {isLoadingSessions && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] py-8">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
              Loading sessions...
            </div>
          )}

          {!isLoadingSessions && sessions.length === 0 && (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">
                No sessions yet. Submit your first brain dump above to get started.
              </p>
            </div>
          )}

          {!isLoadingSessions && sessions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.map((session) => {
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

                return (
                  <div
                    key={session._id}
                    onClick={() => openSession(session)}
                    className="group rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 cursor-pointer transition-all hover:border-[var(--color-accent)] hover:shadow-[var(--shadow-md)]"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2 flex-1">
                        {title}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session._id);
                        }}
                        className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete session"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-2 mb-3">
                      {transcriptSnippet}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-[var(--color-text-primary)] bg-[var(--color-bg-secondary)] px-2 py-0.5 rounded-[var(--radius-full)]">
                        {formattedDate}
                      </span>
                      {ideasCount > 0 && (
                        <span className="text-[11px] text-white bg-[var(--color-accent)] px-2 py-0.5 rounded-[var(--radius-full)]">
                          {ideasCount} idea{ideasCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {pillar && (
                        <span className="text-[11px] text-[var(--color-text-primary)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-2 py-0.5 rounded-[var(--radius-full)]">
                          {pillar}
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
    </div>
  );
}
