'use client';

import { ContentDNAFormData } from '@/types/onboarding';

interface CoreMessageStepProps {
  data: ContentDNAFormData;
  onChange: (updates: Partial<ContentDNAFormData>) => void;
}

export default function CoreMessageStep({ data, onChange }: CoreMessageStepProps) {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center mb-10">
        <h2
          className="text-3xl font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Your Core Message
        </h2>
        <p
          className="text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          The thread that ties everything together.
        </p>
      </div>

      {/* Q16 */}
      <div className="space-y-2">
        <label
          htmlFor="coreMessage"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          If someone watched all your content and walked away with one core message about you, what would you want it to be? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Not a tagline. The thread that ties everything together. The thing that makes someone say &quot;that&apos;s what they&apos;re about.&quot;
        </p>
        <textarea
          id="coreMessage"
          value={data.coreMessage}
          onChange={(e) => onChange({ coreMessage: e.target.value })}
          placeholder="What's the one core message you want people to take away?"
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
    </div>
  );
}
