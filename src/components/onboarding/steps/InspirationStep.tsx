'use client';

import { useState, useCallback } from 'react';
import { ContentDNAFormData, InspirationEntry } from '@/types/onboarding';

type FetchStatus = 'idle' | 'fetching' | 'success' | 'error';

interface TranscriptFetchState {
  status: FetchStatus;
  errorMessage?: string;
  videoTitle?: string;
}

function isYouTubeVideoUrl(url: string): boolean {
  const lower = url.toLowerCase().trim();
  return (
    (lower.includes('youtube.com/watch') || lower.includes('youtu.be/')) &&
    lower.startsWith('http')
  );
}

interface InspirationStepProps {
  data: ContentDNAFormData;
  onChange: (updates: Partial<ContentDNAFormData>) => void;
}

export default function InspirationStep({ data, onChange }: InspirationStepProps) {
  const [fetchStates, setFetchStates] = useState<Record<number, TranscriptFetchState>>({});

  const fetchTranscript = useCallback(async (index: number, url: string) => {
    if (!isYouTubeVideoUrl(url)) return;

    // Skip if already fetched for this exact URL
    const existing = data.inspirations[index];
    if (existing.transcript && existing.transcript.length > 0) return;

    setFetchStates((prev) => ({
      ...prev,
      [index]: { status: 'fetching' },
    }));

    try {
      const response = await fetch('/api/youtube-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        setFetchStates((prev) => ({
          ...prev,
          [index]: {
            status: 'error',
            errorMessage: result.error || 'Could not fetch transcript',
          },
        }));
        return;
      }

      // Store transcript and videoTitle on the InspirationEntry via parent onChange
      const updated = data.inspirations.map((entry, i) =>
        i === index
          ? { ...entry, transcript: result.transcript, videoTitle: result.title }
          : entry
      );
      onChange({ inspirations: updated });

      setFetchStates((prev) => ({
        ...prev,
        [index]: { status: 'success', videoTitle: result.title },
      }));
    } catch {
      setFetchStates((prev) => ({
        ...prev,
        [index]: {
          status: 'error',
          errorMessage: 'Network error. Please try again.',
        },
      }));
    }
  }, [data.inspirations, onChange]);

  const updateInspiration = (index: number, field: keyof InspirationEntry, value: string) => {
    const updated = data.inspirations.map((entry, i) => {
      if (i !== index) return entry;
      if (field === 'url') {
        // URL changed — clear stale transcript data
        return { ...entry, url: value, transcript: undefined, videoTitle: undefined };
      }
      return { ...entry, [field]: value };
    });
    onChange({ inspirations: updated });

    // Clear fetch state when URL changes
    if (field === 'url') {
      setFetchStates((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  };

  const addInspiration = () => {
    if (data.inspirations.length < 10) {
      onChange({ inspirations: [...data.inspirations, { url: '', note: '' }] });
    }
  };

  const removeInspiration = (index: number) => {
    if (data.inspirations.length > 1) {
      onChange({ inspirations: data.inspirations.filter((_, i) => i !== index) });

      // Re-index fetch states
      setFetchStates((prev) => {
        const next: Record<number, TranscriptFetchState> = {};
        Object.entries(prev).forEach(([key, val]) => {
          const k = Number(key);
          if (k < index) next[k] = val;
          else if (k > index) next[k - 1] = val;
          // k === index is dropped
        });
        return next;
      });
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center mb-10">
        <h2
          className="text-3xl font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Your Inspiration
        </h2>
        <p
          className="text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Who inspires you and what format feels right for you?
        </p>
      </div>

      {/* Q14 — Creator URLs */}
      <div className="space-y-2">
        <label
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Which creators do you watch and rewatch, and what pulls you in about their style? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          List 3 to 5 creators you genuinely enjoy. Tell us what it is about them — their energy, how they explain things, their editing, their vibe, whatever it is. Drop their YouTube channel links or specific video URLs if you can. We use these to study their style and help shape yours.
        </p>
      </div>

      <div className="space-y-5">
        {data.inspirations.map((entry, index) => (
          <div
            key={index}
            className="p-5 border space-y-3 transition-all duration-200"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderColor: 'var(--color-border-light)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Creator {index + 1}
              </span>
              {data.inspirations.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeInspiration(index)}
                  className="text-sm transition-opacity hover:opacity-70 cursor-pointer"
                  style={{
                    color: 'var(--color-text-muted)',
                    border: 'none',
                    background: 'none',
                    padding: 0,
                  }}
                >
                  Remove
                </button>
              )}
            </div>

            <input
              type="text"
              value={entry.url}
              onChange={(e) => updateInspiration(index, 'url', e.target.value)}
              placeholder="YouTube channel URL or handle (e.g. @MrBeast)"
              className="w-full px-4 py-3 text-base border transition-colors duration-200 outline-none ring-0"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
                borderRadius: 'var(--radius-md)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-border)';
                const url = e.target.value.trim();
                if (url) {
                  fetchTranscript(index, url);
                }
              }}
              onPaste={(e) => {
                // Use setTimeout to read the value after paste completes
                setTimeout(() => {
                  const url = (e.target as HTMLInputElement).value.trim();
                  if (url) {
                    fetchTranscript(index, url);
                  }
                }, 0);
              }}
            />

            {/* Transcript fetch status */}
            {fetchStates[index]?.status === 'fetching' && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Fetching transcript...
              </div>
            )}

            {fetchStates[index]?.status === 'success' && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-success)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Transcript loaded{fetchStates[index]?.videoTitle ? ` — ${fetchStates[index].videoTitle}` : ''}
              </div>
            )}

            {fetchStates[index]?.status === 'error' && (
              <div className="flex items-center justify-between text-sm" style={{ color: 'var(--color-warning)' }}>
                <span>{fetchStates[index]?.errorMessage || 'Could not fetch transcript'}</span>
                <button
                  type="button"
                  onClick={() => fetchTranscript(index, entry.url)}
                  className="underline cursor-pointer"
                  style={{ background: 'none', border: 'none', color: 'inherit', padding: 0 }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Show if entry already has a transcript from a previous load (e.g., navigating back) */}
            {!fetchStates[index] && entry.transcript && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-success)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Transcript loaded{entry.videoTitle ? ` — ${entry.videoTitle}` : ''}
              </div>
            )}

            <input
              type="text"
              value={entry.note}
              onChange={(e) => updateInspiration(index, 'note', e.target.value)}
              placeholder="What do you like about them? (optional)"
              className="w-full px-4 py-3 text-base border transition-colors duration-200 outline-none ring-0"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
                borderRadius: 'var(--radius-md)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </div>
        ))}
      </div>

      {data.inspirations.length < 10 && (
        <button
          type="button"
          onClick={addInspiration}
          className="w-full py-3 text-base font-medium border-2 border-dashed transition-all duration-200 cursor-pointer"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-accent)';
            e.currentTarget.style.color = 'var(--color-accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
        >
          + Add another creator
        </button>
      )}

      {/* Q15 — Natural Format */}
      <div className="space-y-2 pt-4 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
        <label
          htmlFor="naturalFormat"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          What format feels most natural for you to create in right now? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Talking on camera, recording audio, writing, or something more visual like graphics or carousels? Don&apos;t overthink it. What feels the most doable today, not what you think you should be doing.
        </p>
        <textarea
          id="naturalFormat"
          value={data.naturalFormat}
          onChange={(e) => onChange({ naturalFormat: e.target.value })}
          placeholder="What format feels most natural to you?"
          rows={4}
          className="w-full px-4 py-3 text-base border transition-colors duration-200 resize-none"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
            borderRadius: 'var(--radius-md)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
        />
      </div>
    </div>
  );
}
