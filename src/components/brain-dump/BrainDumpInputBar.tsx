'use client';

import { useState, useRef, useEffect } from 'react';

interface BrainDumpInputBarProps {
  onSubmit: (transcript: string, file?: File | null) => void;
  isSubmitting: boolean;
  onError: (error: string) => void;
}

export default function BrainDumpInputBar({ onSubmit, isSubmitting, onError }: BrainDumpInputBarProps) {
  const [text, setText] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [text]);

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
              setText((prev) => (prev ? prev + '\n\n' + data.text : data.text));
            }
          } else {
            onError('Failed to transcribe audio. Please try again.');
          }
        } catch {
          onError('Failed to transcribe audio. Please try again.');
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
      onError('Could not access microphone. Please allow microphone access or paste your content manually.');
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

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      onError('File is too large. Maximum size is 10MB.');
      return;
    }

    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      onError('Unsupported file type. Please upload a .txt, .pdf, or .doc/.docx file.');
      return;
    }

    // For text files, read directly
    if (file.type === 'text/plain') {
      const fileText = await file.text();
      setText((prev) => (prev ? prev + '\n\n' + fileText : fileText));
      setAttachedFile(file);
    } else {
      // For PDF/doc, just attach and show the name — content will be extracted server-side
      setAttachedFile(file);
    }

    // Reset the input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Submit ─────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!text.trim() && !attachedFile) return;
    onSubmit(text, attachedFile);
    setText('');
    setAttachedFile(null);
    setRecordingTime(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = (text.trim() || attachedFile) && !isSubmitting && !isTranscribing;

  return (
    <div className="flex-shrink-0 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-4 sm:px-10">
      <div className="mx-auto max-w-3xl">
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

        {/* Attached file indicator */}
        {attachedFile && (
          <div className="mb-3 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg-card)] border border-[var(--color-border)] px-3 py-2">
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

        {/* Input row */}
        <div className="flex items-end gap-2">
          {/* Voice record button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isSubmitting || isTranscribing}
            className={`flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full transition-all ${
              isRecording
                ? 'bg-red-500 animate-pulse'
                : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]'
            } disabled:opacity-50`}
            title={isRecording ? 'Stop recording' : 'Record voice'}
          >
            {isRecording ? (
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            )}
          </button>

          {/* File attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting || isRecording}
            className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-all disabled:opacity-50"
            title="Attach file (PDF, DOC, TXT)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Text input */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type or paste your brain dump here..."
              rows={1}
              className="w-full resize-none rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-0 focus:border-[var(--color-accent)]"
              style={{ minHeight: '40px', maxHeight: '200px' }}
            />
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-[var(--color-accent)] text-[var(--color-bg-dark)] hover:bg-[var(--color-accent-hover)] transition-colors disabled:bg-[#555] disabled:text-[#999] disabled:cursor-not-allowed"
            title="Submit brain dump"
          >
            {isSubmitting ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>

        <p className="mt-2 text-[11px] text-[var(--color-text-muted)] text-center">
          Press Enter to submit, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
