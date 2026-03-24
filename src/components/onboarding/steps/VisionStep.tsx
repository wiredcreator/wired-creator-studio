'use client';

import { ContentDNAFormData } from '@/types/onboarding';

interface YourBusinessStepProps {
  data: ContentDNAFormData;
  onChange: (updates: Partial<ContentDNAFormData>) => void;
}

export default function VisionStep({ data, onChange }: YourBusinessStepProps) {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center mb-10">
        <h2
          className="text-3xl font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Your Business
        </h2>
        <p
          className="text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Help us understand what you&apos;re building and how content fits in.
        </p>
      </div>

      {/* Q4 */}
      <div className="space-y-2">
        <label
          htmlFor="offerAndContent"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          What do you sell or plan to sell, and how does content connect to that? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Tell us about your offer, your service, your product, whatever it is. If you don&apos;t have one yet, tell us what you&apos;re working toward. We need to understand this because your content strategy should be built to drive people toward your thing, not just get views.
        </p>
        <textarea
          id="offerAndContent"
          value={data.offerAndContent}
          onChange={(e) => onChange({ offerAndContent: e.target.value })}
          placeholder="Describe your offer and how content connects to it..."
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

      {/* Q5 */}
      <div className="space-y-2">
        <label
          htmlFor="goToPersonFor"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          What do people always come to you for? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Think about the questions friends, coworkers, or clients keep asking you. The stuff people DM you about. The thing someone once said &quot;you should make content about that.&quot; What do you naturally become the go-to person for?
        </p>
        <textarea
          id="goToPersonFor"
          value={data.goToPersonFor}
          onChange={(e) => onChange({ goToPersonFor: e.target.value })}
          placeholder="What do people always come to you for?"
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
