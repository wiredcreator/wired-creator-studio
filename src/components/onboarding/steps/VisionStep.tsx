'use client';

import { ContentDNAFormData } from '@/types/onboarding';

interface VisionStepProps {
  data: ContentDNAFormData;
  onChange: (updates: Partial<ContentDNAFormData>) => void;
}

export default function VisionStep({ data, onChange }: VisionStepProps) {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center mb-10">
        <h2
          className="text-3xl font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          What&apos;s your content vision?
        </h2>
        <p
          className="text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Dream big. There are no wrong answers here.
        </p>
      </div>

      {/* Content Goals */}
      <div className="space-y-2">
        <label
          htmlFor="contentGoals"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          What are your goals for content creation? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Why are you creating content? What does success look like?
        </p>
        <textarea
          id="contentGoals"
          value={data.contentGoals}
          onChange={(e) => onChange({ contentGoals: e.target.value })}
          placeholder="E.g., I want to build an audience that trusts my expertise so I can grow my coaching business..."
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

      {/* 12-Week Vision */}
      <div className="space-y-2">
        <label
          htmlFor="twelveWeekVision"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Where do you see your content in 12 weeks? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Be specific. How many videos? What topics? How does it feel?
        </p>
        <textarea
          id="twelveWeekVision"
          value={data.twelveWeekVision}
          onChange={(e) => onChange({ twelveWeekVision: e.target.value })}
          placeholder="E.g., I want to have published 12 YouTube videos, have a consistent posting schedule, and feel confident on camera..."
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
