'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import VoiceInputWrapper from '@/components/VoiceInputWrapper';

type Mode = null | 'voice' | 'write' | 'upload';

export default function BrainDumpFAB() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(null);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTranscriptions = useRef<number>(0);
  const stoppingRef = useRef<boolean>(false);

  // Write state
  const [writeText, setWriteText] = useState('');

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadText, setUploadText] = useState('');
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showRouting, setShowRouting] = useState(false);
  const [savedContent, setSavedContent] = useState('');
  const [routingSaving, setRoutingSaving] = useState(false);
  const [pendingMode, setPendingMode] = useState<Mode>(null);
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!isRecording) {
          handleClose();
        }
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open, isRecording]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isRecording) {
        handleClose();
      }
    };
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, isRecording]);

  const handleClose = useCallback(() => {
    if (isRecording) return;
    setOpen(false);
    setMode(null);
    setVoiceTranscript('');
    setWriteText('');
    setUploadFile(null);
    setUploadText('');
    setError('');
    setSaved(false);
    setShowRouting(false);
    setSavedContent('');
    setRoutingSaving(false);
    setPendingMode(null);
    setRecordingTime(0);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ─── Voice Recording (chunked, every 2 minutes) ─────────────────────

  const CHUNK_INTERVAL_MS = 120_000;

  const transcribeBlob = async (blob: Blob) => {
    if (blob.size === 0) return;
    pendingTranscriptions.current += 1;
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
          setVoiceTranscript((prev) => (prev ? prev + ' ' + data.text : data.text));
        }
      }
    } catch (err) {
      console.error('Transcription failed:', err);
      setError('Transcription failed. Please try again.');
    } finally {
      pendingTranscriptions.current -= 1;
      if (pendingTranscriptions.current <= 0) {
        pendingTranscriptions.current = 0;
        setTranscribing(false);
      }
    }
  };

  const createRecorder = (stream: MediaStream) => {
    const recorder = new MediaRecorder(stream);
    const localChunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) localChunks.push(e.data);
    };

    recorder.onstop = () => {
      if (localChunks.length > 0) {
        const blob = new Blob(localChunks, { type: 'audio/webm' });
        transcribeBlob(blob);
      }
      // If this was the final stop (user clicked stop), kill the stream
      if (stoppingRef.current) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        stoppingRef.current = false;
      }
    };

    return recorder;
  };

  const cycleRecorder = () => {
    const recorder = mediaRecorderRef.current;
    const stream = streamRef.current;
    if (!recorder || !stream || recorder.state !== 'recording') return;

    // Stop current recorder; its onstop will transcribe its own local chunks
    // stoppingRef is false here so the stream stays alive
    recorder.stop();

    // Start a fresh recorder on the same stream
    const newRecorder = createRecorder(stream);
    newRecorder.start();
    mediaRecorderRef.current = newRecorder;
  };

  const startRecording = async () => {
    stoppingRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = createRecorder(stream);

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);

      // Auto-cycle every 2 minutes for chunked transcription
      chunkTimerRef.current = setInterval(cycleRecorder, CHUNK_INTERVAL_MS);
    } catch {
      setError('Could not access microphone. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    // Stop the chunk cycle timer first to prevent race conditions
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }

    // Mark as final stop so onstop callback knows to kill the stream
    stoppingRef.current = true;

    // Stop the recorder (onstop will handle transcription + stream cleanup)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      // Recorder already stopped (e.g. cycle just happened), clean up stream directly
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      stoppingRef.current = false;
    }

    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // ─── File Upload Parsing ────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const allowedExtensions = ['.txt', '.pdf', '.doc', '.docx'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      setError('Please upload a TXT, PDF, DOC, or DOCX file.');
      return;
    }

    setUploadFile(file);
    setError('');

    // For txt files, read directly
    if (file.type === 'text/plain' || ext === '.txt') {
      setParsing(true);
      try {
        const text = await file.text();
        setUploadText(text);
      } catch {
        setError('Failed to read file.');
      } finally {
        setParsing(false);
      }
    } else {
      // For PDF/DOC/DOCX, we'll send the raw text content hint
      // The user can review/edit before saving
      setParsing(true);
      try {
        const text = await file.text();
        setUploadText(text);
      } catch {
        // If binary read fails, let user know
        setUploadText('');
        setError('Could not extract text from this file. Please copy-paste the content using the Write option instead.');
      } finally {
        setParsing(false);
      }
    }
  };

  // ─── Save Handlers (capture content, then show routing) ────────────

  const prepareVoiceStorm = () => {
    if (!voiceTranscript.trim()) return;
    setSavedContent(voiceTranscript.trim());
    setPendingMode('voice');
    setShowRouting(true);
  };

  const prepareWriteDump = () => {
    if (!writeText.trim()) return;
    setSavedContent(writeText.trim());
    setPendingMode('write');
    setShowRouting(true);
  };

  const prepareUpload = () => {
    if (!uploadText.trim()) return;
    setSavedContent(uploadText.trim());
    setPendingMode('upload');
    setShowRouting(true);
  };

  // ─── Routing Handlers — submit to API with chosen destination ──────

  const handleRouteSubmit = async (destination: 'ideas' | 'brand_brain' | 'both') => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setRoutingSaving(true);
    setError('');
    try {
      const isVoice = pendingMode === 'voice';

      if (isVoice) {
        // Save voice storming session first
        const vsRes = await fetch('/api/voice-storming', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: savedContent,
            sessionType: 'freeform',
            duration: recordingTime,
          }),
        });
        if (!vsRes.ok) throw new Error('Failed to save voice storming');
        const vsData = await vsRes.json();
        const newId = vsData._id ?? vsData.data?._id;
        if (newId) {
          fetch(`/api/voice-storming/${newId}/process`, { method: 'POST' }).catch(() => {});
        }
      }

      // Submit brain dump with chosen destination
      // For voice mode, skip AI processing and XP since voice-storming/process handles that
      const res = await fetch('/api/brain-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: savedContent,
          callType: 'brain_dump',
          destination,
          ...(isVoice && { skipAiProcessing: true, skipXp: true }),
        }),
      });
      if (!res.ok) throw new Error('Failed to save');

      setSaved(true);
      setShowRouting(false);
      setTimeout(() => handleClose(), 1500);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setRoutingSaving(false);
      isSubmittingRef.current = false;
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-40">
      {/* Popup Panel */}
      {open && (
        <div className="absolute bottom-16 right-0 w-[380px] rounded-[var(--radius-lg)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-xl overflow-hidden mb-2">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                {showRouting && !saved && 'Almost there'}
                {!showRouting && mode === null && 'Brain Dump'}
                {!showRouting && mode === 'voice' && 'Voice Storm'}
                {!showRouting && mode === 'write' && 'Quick Write'}
                {!showRouting && mode === 'upload' && 'Upload Document'}
              </p>
              <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
                {showRouting && !saved && 'Choose where to send your brain dump.'}
                {!showRouting && mode === null && 'Capture your thoughts without leaving this page.'}
                {!showRouting && mode === 'voice' && 'Record and we\'ll transcribe it.'}
                {!showRouting && mode === 'write' && 'Type out your thoughts.'}
                {!showRouting && mode === 'upload' && 'Upload a document to extract ideas.'}
              </p>
            </div>
            {mode !== null && !isRecording && !saved && (
              <button
                onClick={() => {
                  if (showRouting && !routingSaving) {
                    // Go back to the input mode
                    setShowRouting(false);
                    setSavedContent('');
                    setPendingMode(null);
                    setError('');
                    return;
                  }
                  setMode(null);
                  setVoiceTranscript('');
                  setWriteText('');
                  setUploadFile(null);
                  setUploadText('');
                  setError('');
                  setSaved(false);
                  setShowRouting(false);
                  setSavedContent('');
                  setPendingMode(null);
                  setRecordingTime(0);
                }}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
              </button>
            )}
          </div>

          {/* Success message */}
          {saved && (
            <div className="px-5 py-8 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-900 mx-auto mb-3">
                <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Saved!</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">Your brain dump has been captured.</p>
            </div>
          )}

          {/* Routing prompt — "Where should this go?" */}
          {showRouting && !saved && (
            <div className="px-5 py-5 space-y-3">
              <p className="text-sm font-medium text-[var(--color-text-primary)] text-center">
                Where should this go?
              </p>

              {error && <p className="text-xs text-[var(--color-error)] text-center">{error}</p>}

              <div className="space-y-2">
                <button
                  onClick={() => handleRouteSubmit('ideas')}
                  disabled={routingSaving}
                  className="w-full text-left px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] hover:border-[var(--color-accent)] disabled:opacity-50 transition-colors"
                >
                  <p className="text-[13px] font-medium text-[var(--color-text-primary)]">Extract Ideas</p>
                  <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">AI pulls out content ideas from your dump</p>
                </button>
                <button
                  onClick={() => handleRouteSubmit('brand_brain')}
                  disabled={routingSaving}
                  className="w-full text-left px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] hover:border-[var(--color-accent)] disabled:opacity-50 transition-colors"
                >
                  <p className="text-[13px] font-medium text-[var(--color-text-primary)]">Save to Brand Brain</p>
                  <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">Store as raw context for your brand voice</p>
                </button>
                <button
                  onClick={() => handleRouteSubmit('both')}
                  disabled={routingSaving}
                  className="w-full text-left px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-accent)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-hover)] disabled:opacity-50 transition-colors"
                >
                  <p className="text-[13px] font-medium text-[var(--color-text-primary)]">Both</p>
                  <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">Extract ideas and save to Brand Brain</p>
                </button>
              </div>

              {routingSaving && (
                <div className="flex items-center justify-center gap-2 text-sm text-[var(--color-accent)]">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </div>
              )}
            </div>
          )}

          {/* Mode Selection */}
          {mode === null && !saved && !showRouting && (
            <div className="p-3 space-y-1">
              {/* Voice Storm */}
              <button
                onClick={() => setMode('voice')}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] text-left hover:bg-[var(--color-bg-tertiary)] transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-900">
                  <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[var(--color-text-primary)]">Voice Storm</p>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">Record your thoughts, we'll transcribe them</p>
                </div>
              </button>

              {/* Write */}
              <button
                onClick={() => setMode('write')}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] text-left hover:bg-[var(--color-bg-tertiary)] transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-900">
                  <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[var(--color-text-primary)]">Write</p>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">Type or paste your notes quickly</p>
                </div>
              </button>

              {/* Upload removed per client request */}
            </div>
          )}

          {/* Voice Storm Mode */}
          {mode === 'voice' && !saved && !showRouting && (
            <div className="p-5 space-y-4">
              {/* Recording controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={transcribing && !isRecording}
                  className={`flex items-center justify-center h-14 w-14 rounded-full transition-all ${
                    isRecording
                      ? 'bg-red-500 animate-pulse'
                      : 'bg-[var(--color-accent)] hover:opacity-90'
                  } disabled:opacity-50`}
                >
                  {isRecording ? (
                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Recording indicator */}
              <div className="text-center">
                {isRecording && (
                  <div className="flex items-center justify-center gap-2 text-sm text-red-400">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    Recording {formatTime(recordingTime)}
                  </div>
                )}
                {!isRecording && recordingTime === 0 && !transcribing && !voiceTranscript && (
                  <p className="text-xs text-[var(--color-text-muted)]">Tap to start recording</p>
                )}
                {!isRecording && recordingTime > 0 && !transcribing && (
                  <p className="text-xs text-[var(--color-text-muted)]">Recorded {formatTime(recordingTime)}</p>
                )}
                {transcribing && (
                  <div className="flex items-center justify-center gap-2 text-sm text-[var(--color-accent)]">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Transcribing...
                  </div>
                )}
              </div>

              {/* Always-visible transcript textarea */}
              <textarea
                readOnly
                value={voiceTranscript}
                rows={4}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text-primary)] resize-none outline-none ring-0 max-h-40 overflow-y-auto"
              />

              {/* Error */}
              {error && <p className="text-xs text-[var(--color-error)] text-center">{error}</p>}

              {/* Save & Redo buttons */}
              {voiceTranscript && !isRecording && (
                <div className="flex gap-2">
                  <button
                    onClick={prepareVoiceStorm}
                    disabled={saving || transcribing}
                    className="flex-1 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--color-bg-dark)] text-sm font-medium hover:opacity-90 disabled:bg-[#555] disabled:text-[#999] transition-opacity"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => {
                      setVoiceTranscript('');
                      setRecordingTime(0);
                      setError('');
                    }}
                    disabled={saving || transcribing}
                    className="px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm font-medium hover:bg-[var(--color-hover)] disabled:opacity-50 transition-colors"
                  >
                    Redo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Write Mode */}
          {mode === 'write' && !saved && !showRouting && (
            <div className="p-5 space-y-4">
              <VoiceInputWrapper onTranscript={(text) => setWriteText((prev) => prev ? prev + '\n' + text : text)}>
                <textarea
                  value={writeText}
                  onChange={(e) => {
                    setWriteText(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="What's on your mind? Just start typing..."
                  rows={5}
                  autoFocus
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] resize-none focus:outline-none focus:ring-0 focus:border-[var(--color-accent)]"
                />
              </VoiceInputWrapper>

              {/* Error */}
              {error && <p className="text-xs text-[var(--color-error)] text-center">{error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={prepareWriteDump}
                  disabled={saving || !writeText.trim()}
                  className="flex-1 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--color-bg-dark)] text-sm font-medium hover:opacity-90 disabled:bg-[#555] disabled:text-[#999] transition-opacity"
                >
                  Next
                </button>
                <button
                  onClick={() => {
                    setWriteText('');
                    setError('');
                  }}
                  disabled={saving || !writeText.trim()}
                  className="px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm font-medium hover:bg-[var(--color-hover)] disabled:opacity-50 transition-colors"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}

          {/* Upload Mode */}
          {mode === 'upload' && !saved && !showRouting && (
            <div className="p-5 space-y-4">
              {!uploadFile ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg-tertiary)] hover:border-[var(--color-accent)] transition-colors text-center"
                >
                  <svg className="h-8 w-8 mx-auto text-[var(--color-text-muted)] mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm text-[var(--color-text-secondary)]">Click to select a file</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">PDF, DOC, DOCX, or TXT</p>
                </button>
              ) : (
                <>
                  {/* File info */}
                  <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2.5">
                    <svg className="h-5 w-5 text-[var(--color-text-secondary)] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--color-text-primary)] truncate">{uploadFile.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={() => {
                        setUploadFile(null);
                        setUploadText('');
                        setError('');
                      }}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Parsing indicator */}
                  {parsing && (
                    <div className="flex items-center justify-center gap-2 text-sm text-[var(--color-accent)]">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Extracting text...
                    </div>
                  )}

                  {/* Extracted text preview / edit */}
                  {uploadText && (
                    <VoiceInputWrapper onTranscript={(text) => setUploadText((prev) => prev ? prev + '\n' + text : text)}>
                      <textarea
                        value={uploadText}
                        onChange={(e) => setUploadText(e.target.value)}
                        rows={5}
                        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] resize-none focus:outline-none focus:ring-0 focus:border-[var(--color-accent)]"
                      />
                    </VoiceInputWrapper>
                  )}
                </>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.doc,.docx,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Error */}
              {error && <p className="text-xs text-[var(--color-error)] text-center">{error}</p>}

              {/* Save button */}
              {uploadText && !parsing && (
                <button
                  onClick={prepareUpload}
                  disabled={saving || !uploadText.trim()}
                  className="w-full py-2.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--color-bg-dark)] text-sm font-medium hover:opacity-90 disabled:bg-[#555] disabled:text-[#999] transition-opacity"
                >
                  Next
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => {
          if (open) {
            handleClose();
          } else {
            setOpen(true);
          }
        }}
        className="flex items-center gap-2 text-white text-sm font-medium transition-all hover:scale-105 hover:opacity-90"
        style={{
          padding: '12px 24px',
          borderRadius: 24,
          backgroundColor: 'var(--color-accent, #4A90D9)',
          boxShadow: '0 4px 14px rgba(74,144,217,0.35)',
          border: 'none',
          cursor: 'pointer',
        }}
        aria-label="Brain Dump"
      >
        {open ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <span className="text-base leading-none">&#10022;</span>
        )}
        <span>{open ? 'Close' : 'Brain dump'}</span>
      </button>
    </div>
  );
}
