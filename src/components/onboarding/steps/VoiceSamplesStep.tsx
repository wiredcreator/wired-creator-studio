'use client';

import { ContentDNAFormData } from '@/types/onboarding';

interface VoiceSamplesStepProps {
  data: ContentDNAFormData;
  onChange: (updates: Partial<ContentDNAFormData>) => void;
}

export default function VoiceSamplesStep({ data, onChange }: VoiceSamplesStepProps) {
  const updateSample = (index: number, value: string) => {
    const updated = data.voiceSamples.map((s, i) => (i === index ? value : s));
    onChange({ voiceSamples: updated });
  };

  const addSample = () => {
    if (data.voiceSamples.length < 5) {
      onChange({ voiceSamples: [...data.voiceSamples, ''] });
    }
  };

  const removeSample = (index: number) => {
    if (data.voiceSamples.length > 1) {
      onChange({ voiceSamples: data.voiceSamples.filter((_, i) => i !== index) });
    }
  };

  const toggleNoContent = () => {
    onChange({
      noExistingContent: !data.noExistingContent,
      voiceSamples: !data.noExistingContent ? [''] : data.voiceSamples,
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center mb-10">
        <h2
          className="text-3xl font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Share your existing content
        </h2>
        <p
          className="text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Paste anything you&apos;ve written - blog posts, captions, scripts, emails.
        </p>
      </div>

      {/* Skip option */}
      <label
        className="flex items-center gap-3 p-4 border cursor-pointer transition-all duration-200"
        style={{
          backgroundColor: data.noExistingContent
            ? 'var(--color-accent-subtle)'
            : 'var(--color-bg-card)',
          borderColor: data.noExistingContent
            ? 'var(--color-accent)'
            : 'var(--color-border)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div
          className="w-5 h-5 flex items-center justify-center border-2 flex-shrink-0 transition-colors duration-200"
          style={{
            borderColor: data.noExistingContent
              ? 'var(--color-accent)'
              : 'var(--color-border)',
            backgroundColor: data.noExistingContent
              ? 'var(--color-accent)'
              : 'transparent',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {data.noExistingContent && (
            <span className="text-white text-xs font-bold">&#10003;</span>
          )}
        </div>
        <input
          type="checkbox"
          checked={data.noExistingContent}
          onChange={toggleNoContent}
          className="sr-only"
        />
        <div>
          <span
            className="text-base font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            I don&apos;t have any existing content yet
          </span>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            No worries at all. We&apos;ll build your voice from scratch together.
          </p>
        </div>
      </label>

      {/* Voice samples */}
      {!data.noExistingContent && (
        <div className="space-y-5">
          {data.voiceSamples.map((sample, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Sample {index + 1}
                </label>
                {data.voiceSamples.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSample(index)}
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
              <textarea
                value={sample}
                onChange={(e) => updateSample(index, e.target.value)}
                placeholder="Paste a blog post, social media caption, newsletter excerpt, or script..."
                rows={5}
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
          ))}

          {data.voiceSamples.length < 5 && (
            <button
              type="button"
              onClick={addSample}
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
              + Add another sample
            </button>
          )}

          <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
            The more samples you share, the better we can capture your authentic voice.
          </p>
        </div>
      )}
    </div>
  );
}
