'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import BrainDumpResults from '@/components/brain-dump/BrainDumpResults';
import VoiceInputWrapper from '@/components/VoiceInputWrapper';

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

export default function BrainDumpPath() {
  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // File attach state
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Claire expanded state
  const [claireExpanded, setClaireExpanded] = useState(false);

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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ─── Recording ──────────────────────────────────────────────────────

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
              setTranscript((prev) => (prev ? prev + '\n\n' + data.text : data.text));
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
      setError('Could not access microphone. Please allow microphone access.');
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
      setTranscript((prev) => (prev ? prev + '\n\n' + fileText : fileText));
    }

    setAttachedFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Submit ─────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!transcript.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError('');
    setExtractedData(null);

    try {
      const res = await fetch('/api/brain-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript.trim(),
          title: title.trim() || undefined,
          userId,
          callType: 'brain_dump',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to process brain dump');
      }

      const data = await res.json();
      setExtractedData(data.extracted);
      setTranscript('');
      setTitle('');
      setAttachedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [transcript, title, isSubmitting, userId]);

  // Show results if we have them
  if (extractedData) {
    return (
      <div className="w-full max-w-2xl animate-fadeIn">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-medium text-[var(--color-text-primary)]">
            Here&apos;s what we found
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Ideas, stories, and insights extracted from your brain dump.
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-[var(--shadow-sm)]">
          <BrainDumpResults
            contentIdeas={extractedData.contentIdeas}
            stories={extractedData.stories}
            insights={extractedData.insights}
            themes={extractedData.themes}
          />
        </div>
        <div className="mt-6 text-center">
          <button
            onClick={() => setExtractedData(null)}
            className="text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            Do another brain dump
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl animate-fadeIn">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--color-text-secondary)]">
          Focus Mode &middot; Brain Dump
        </p>
        <h2 className="text-2xl font-semibold text-[var(--color-text)]">
          Let it all out
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Don&apos;t filter &mdash; write, record, or attach anything. Sort it later.
        </p>
      </div>

      {/* Main card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-sm)]">
        {/* Title input */}
        <div className="border-b border-[var(--color-border)] px-5 py-3">
          <input
            data-transparent=""
            style={{ backgroundColor: 'transparent' }}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give this dump a title... (optional)"
            className="w-full bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
          />
        </div>

        {/* Textarea */}
        <div className="px-5 py-4">
          <VoiceInputWrapper onTranscript={(text) => setTranscript((prev) => prev ? prev + '\n\n' + text : text)}>
            <textarea
              data-transparent=""
              style={{ backgroundColor: 'transparent' }}
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                if (error) setError('');
              }}
              placeholder="What's swirling around in your head? Ideas, half-baked thoughts, random sparks &mdash; paste anything, speak it, or just start typing. Nothing is too messy here."
              rows={10}
              className="w-full resize-y bg-transparent text-sm leading-relaxed text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            />
          </VoiceInputWrapper>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="mx-5 mb-3 flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[var(--color-text-primary)]">Recording: {formatTime(recordingTime)}</span>
            <button
              onClick={stopRecording}
              className="ml-auto text-xs text-[var(--color-error)] hover:underline"
            >
              Stop
            </button>
          </div>
        )}

        {/* Transcribing indicator */}
        {isTranscribing && (
          <div className="mx-5 mb-3 flex items-center gap-2 text-sm text-[var(--color-accent)]">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Transcribing audio...
          </div>
        )}

        {/* Attached file indicator */}
        {attachedFile && (
          <div className="mx-5 mb-3 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-3 py-2">
            <svg className="h-4 w-4 text-[var(--color-accent)] flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
            </svg>
            <span className="text-sm text-[var(--color-text-primary)] truncate flex-1">{attachedFile.name}</span>
            <button
              onClick={removeFile}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors flex-shrink-0"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Bottom bar: actions left, save right */}
        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3">
          <div className="flex items-center gap-2">
            {/* Record voice */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isSubmitting || isTranscribing}
              className={`flex items-center gap-1.5 rounded-[var(--radius-md)] border px-3 py-1.5 text-sm transition-all ${
                isRecording
                  ? 'border-red-500 bg-red-500/10 text-red-500 animate-pulse'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]'
              } disabled:opacity-50`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
              {isRecording ? `Stop (${formatTime(recordingTime)})` : 'Record voice'}
            </button>

            {/* Attach file */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || isRecording}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] transition-all hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
              </svg>
              Attach file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Save dump */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !transcript.trim()}
            className="rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] px-4 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
                Saving...
              </span>
            ) : (
              'Save dump'
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-3 text-sm text-[var(--color-error)]">{error}</p>
      )}

      {/* Claire AI Card */}
      <div className="mt-6">
        <button
          onClick={() => setClaireExpanded(!claireExpanded)}
          className="w-full rounded-[var(--radius-lg)] p-5 text-left transition-all"
          style={{
            background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #C084FC 100%)',
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-white">Claire</span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/90">
                    AI
                  </span>
                </div>
                <p className="mt-0.5 text-sm font-medium text-white/80">
                  Ask Claire to give you Clarity &#10024;
                </p>
              </div>
            </div>
            <svg
              className={`h-5 w-5 text-white/60 transition-transform ${claireExpanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Claire knows your content history, your audience, and your creative patterns.
            She asks you targeted questions to help you uncover powerful content ideas &mdash; even on the days when your brain feels completely blank.
          </p>
        </button>
      </div>
    </div>
  );
}
