'use client';

import { ContentDNAFormData } from '@/types/onboarding';

interface AudienceStepProps {
  data: ContentDNAFormData;
  onChange: (updates: Partial<ContentDNAFormData>) => void;
}

export default function AudienceStep({ data, onChange }: AudienceStepProps) {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center mb-10">
        <h2
          className="text-3xl font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Who are you creating for?
        </h2>
        <p
          className="text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Picture the person who will binge your content.
        </p>
      </div>

      {/* Ideal Viewer */}
      <div className="space-y-2">
        <label
          htmlFor="idealViewer"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Describe your ideal viewer or reader <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Who are they? What do they care about? What keeps them up at night?
        </p>
        <textarea
          id="idealViewer"
          value={data.idealViewer}
          onChange={(e) => onChange({ idealViewer: e.target.value })}
          placeholder="E.g., Busy professionals in their 30s who want to eat healthier but feel overwhelmed by conflicting nutrition advice..."
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

      {/* Problems Solved */}
      <div className="space-y-2">
        <label
          htmlFor="problemsSolved"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          What problems do you solve for them? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          What transformation do you help them achieve?
        </p>
        <textarea
          id="problemsSolved"
          value={data.problemsSolved}
          onChange={(e) => onChange({ problemsSolved: e.target.value })}
          placeholder="E.g., I help them cut through the noise and build simple, sustainable eating habits that actually stick..."
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
