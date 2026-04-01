'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceTextareaProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export default function VoiceTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 5,
}: VoiceTextareaProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    setError(null);
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
              onChange(value ? value + '\n\n' + data.text : data.text);
            }
          } else {
            setError('Failed to transcribe. Please try again.');
          }
        } catch {
          setError('Failed to transcribe. Please try again.');
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
      setError('Could not access microphone. Please allow mic access.');
    }
  }, [onChange, value]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return (
    <div className="relative">
      {/* Recording / transcribing indicator above textarea */}
      {(isRecording || isTranscribing) && (
        <div
          className="flex items-center gap-2 text-sm mb-2 px-1"
          style={{ color: isRecording ? '#ef4444' : 'var(--color-accent)' }}
        >
          {isRecording ? (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              <span style={{ color: 'var(--color-text-primary)' }}>
                Recording: {formatTime(recordingTime)}
              </span>
              <button
                type="button"
                onClick={stopRecording}
                className="ml-auto text-xs cursor-pointer hover:underline"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  padding: 0,
                }}
              >
                Stop Recording
              </button>
            </>
          ) : (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Transcribing...</span>
            </>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          className="text-sm mb-2 px-1"
          style={{ color: 'var(--color-warning)' }}
        >
          {error}
        </div>
      )}

      {/* Textarea with mic button */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setError(null);
          }}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-4 py-3 pr-12 text-base border transition-colors duration-200 resize-none outline-none ring-0"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
            borderRadius: 'var(--radius-md)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
        />

        {/* Mic button inside textarea, bottom-right */}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isTranscribing}
          className="absolute bottom-2.5 right-2.5 flex items-center justify-center h-8 w-8 rounded-full transition-all cursor-pointer"
          style={{
            backgroundColor: isRecording
              ? '#ef4444'
              : 'var(--color-bg-secondary)',
            border: isRecording ? 'none' : '1px solid var(--color-border)',
            opacity: isTranscribing ? 0.5 : 1,
          }}
          title={isRecording ? 'Stop recording' : 'Record voice'}
        >
          {isRecording ? (
            <svg
              className="h-3.5 w-3.5"
              fill="white"
              viewBox="0 0 24 24"
            >
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="var(--color-text-muted)"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
