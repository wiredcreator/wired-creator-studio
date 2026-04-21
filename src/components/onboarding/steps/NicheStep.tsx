'use client';

import { ContentDNAFormData } from '@/types/onboarding';
import VoiceInputWrapper from '@/components/VoiceInputWrapper';

interface YourStoriesStepProps {
  data: ContentDNAFormData;
  onChange: (updates: Partial<ContentDNAFormData>) => void;
}

export default function NicheStep({ data, onChange }: YourStoriesStepProps) {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center mb-10">
        <h2
          className="text-3xl font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Your Stories
        </h2>
        <p
          className="text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          The experiences that make your content yours.
        </p>
      </div>

      {/* Q9 */}
      <div className="space-y-2">
        <label
          htmlFor="personalStories"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          What are 2 or 3 personal stories that shaped who you are today? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          They don&apos;t need to be dramatic. A turning point, a failure, a moment of clarity, something funny that taught you something real. Stories are what make content stick. We want to know which ones are yours to tell.
        </p>
        <VoiceInputWrapper onTranscript={(text) => onChange({ personalStories: data.personalStories ? data.personalStories + '\n' + text : text })}>
        <textarea
          id="personalStories"
          value={data.personalStories}
          onChange={(e) => onChange({ personalStories: e.target.value })}
          placeholder="Share 2-3 personal stories that shaped you..."
          rows={6}
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
        </VoiceInputWrapper>
      </div>

      {/* Q10 */}
      <div className="space-y-2">
        <label
          htmlFor="knownForAndAgainst"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          What do you want to be known FOR, and what do you want to be known AGAINST? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Give us two of each. The &quot;for&quot; is what you want people to associate with your name every time they see your content. The &quot;against&quot; is the stuff in your industry that you reject, disagree with, or refuse to do. These become the ideas you&apos;ll repeat over and over through different stories and scenarios.
        </p>
        <VoiceInputWrapper onTranscript={(text) => onChange({ knownForAndAgainst: data.knownForAndAgainst ? data.knownForAndAgainst + '\n' + text : text })}>
        <textarea
          id="knownForAndAgainst"
          value={data.knownForAndAgainst}
          onChange={(e) => onChange({ knownForAndAgainst: e.target.value })}
          placeholder={"Known FOR: ...\nKnown AGAINST: ..."}
          rows={6}
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
        </VoiceInputWrapper>
      </div>
    </div>
  );
}
