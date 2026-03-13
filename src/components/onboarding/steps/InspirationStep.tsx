'use client';

import { ContentDNAFormData, InspirationEntry } from '@/types/onboarding';

interface InspirationStepProps {
  data: ContentDNAFormData;
  onChange: (updates: Partial<ContentDNAFormData>) => void;
}

export default function InspirationStep({ data, onChange }: InspirationStepProps) {
  const updateInspiration = (index: number, field: keyof InspirationEntry, value: string) => {
    const updated = data.inspirations.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry
    );
    onChange({ inspirations: updated });
  };

  const addInspiration = () => {
    if (data.inspirations.length < 10) {
      onChange({ inspirations: [...data.inspirations, { url: '', note: '' }] });
    }
  };

  const removeInspiration = (index: number) => {
    if (data.inspirations.length > 1) {
      onChange({ inspirations: data.inspirations.filter((_, i) => i !== index) });
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center mb-10">
        <h2
          className="text-3xl font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Creators you resonate with
        </h2>
        <p
          className="text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Share creators whose style, energy, or approach inspires you.
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
              placeholder="YouTube URL or channel name"
              className="w-full px-4 py-3 text-base border transition-colors duration-200"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
                borderRadius: 'var(--radius-md)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />

            <input
              type="text"
              value={entry.note}
              onChange={(e) => updateInspiration(index, 'note', e.target.value)}
              placeholder="What do you like about them? (optional)"
              className="w-full px-4 py-3 text-base border transition-colors duration-200"
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

      <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
        We&apos;ll analyze their content style to help shape your unique voice.
      </p>
    </div>
  );
}
