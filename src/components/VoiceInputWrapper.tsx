'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const CHUNK_INTERVAL_MS = 120_000; // Auto-transcribe every 2 minutes

interface VoiceInputWrapperProps {
  children: React.ReactNode;
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceInputWrapper({
  children,
  onTranscript,
  disabled = false,
}: VoiceInputWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTranscriptions = useRef(0);
  const stoppingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === 'recording'
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const transcribeBlob = useCallback(
    async (blob: Blob) => {
      pendingTranscriptions.current += 1;
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
            onTranscript(data.text);
          }
        } else {
          setError('Failed to transcribe. Please try again.');
        }
      } catch {
        setError('Failed to transcribe. Please try again.');
      } finally {
        pendingTranscriptions.current -= 1;
        if (pendingTranscriptions.current <= 0) {
          pendingTranscriptions.current = 0;
          setIsTranscribing(false);
        }
      }
    },
    [onTranscript]
  );

  const createRecorder = useCallback(
    (stream: MediaStream) => {
      const recorder = new MediaRecorder(stream);
      const localChunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) localChunks.push(e.data);
      };

      recorder.onstop = () => {
        if (localChunks.length > 0) {
          const blob = new Blob(localChunks, { type: 'audio/webm' });
          if (blob.size > 0) {
            transcribeBlob(blob);
          }
        }
        if (stoppingRef.current) {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }
          stoppingRef.current = false;
        }
      };

      return recorder;
    },
    [transcribeBlob]
  );

  const cycleRecorder = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    const stream = streamRef.current;
    if (!recorder || !stream || recorder.state !== 'recording') return;

    recorder.stop();

    const newRecorder = createRecorder(stream);
    newRecorder.start();
    mediaRecorderRef.current = newRecorder;
  }, [createRecorder]);

  const startRecording = useCallback(async () => {
    setError(null);
    stoppingRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = createRecorder(stream);

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(
        () => setRecordingTime((t) => t + 1),
        1000
      );

      chunkTimerRef.current = setInterval(cycleRecorder, CHUNK_INTERVAL_MS);
    } catch {
      setError('Could not access microphone. Please allow mic access.');
    }
  }, [createRecorder, cycleRecorder]);

  const stopRecording = useCallback(() => {
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }

    stoppingRef.current = true;

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.stop();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      stoppingRef.current = false;
    }

    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showButton = isHovered || isRecording || isTranscribing;

  return (
    <div>
      {/* Recording / transcribing status indicator */}
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

      {/* Wrapper around the textarea child */}
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}

        {/* Mic button, bottom-right */}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || isTranscribing}
          className="absolute bottom-2 right-2 flex items-center justify-center h-7 w-7 rounded-full transition-opacity duration-150 cursor-pointer"
          style={{
            backgroundColor: isRecording
              ? '#ef4444'
              : 'var(--color-bg-secondary)',
            border: isRecording
              ? 'none'
              : '1px solid var(--color-border)',
            opacity: showButton ? (disabled || isTranscribing ? 0.5 : 1) : 0,
            pointerEvents: showButton ? 'auto' : 'none',
          }}
          title={isRecording ? 'Stop recording' : 'Record voice'}
        >
          {isRecording ? (
            <svg className="h-3 w-3 animate-pulse" fill="white" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg
              className="h-3 w-3"
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
