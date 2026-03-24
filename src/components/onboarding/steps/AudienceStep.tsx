'use client';

import { ContentDNAFormData } from '@/types/onboarding';

interface YourPassionStepProps {
  data: ContentDNAFormData;
  onChange: (updates: Partial<ContentDNAFormData>) => void;
}

export default function AudienceStep({ data, onChange }: YourPassionStepProps) {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center mb-10">
        <h2
          className="text-3xl font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Your Passion
        </h2>
        <p
          className="text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          What fires you up and who are you here to help?
        </p>
      </div>

      {/* Q6 */}
      <div className="space-y-2">
        <label
          htmlFor="talkWithoutPreparing"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          What could you talk about for 30 minutes without preparing? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Not what you think you should talk about. What actually fires you up. The topics where you lose track of time and catch yourself mid-rant. List as many as come to mind.
        </p>
        <textarea
          id="talkWithoutPreparing"
          value={data.talkWithoutPreparing}
          onChange={(e) => onChange({ talkWithoutPreparing: e.target.value })}
          placeholder="What topics fire you up?"
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

      {/* Q7 */}
      <div className="space-y-2">
        <label
          htmlFor="audienceAndProblem"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Who do you want your content to reach, and what painful problem are you solving for them? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Describe them like a real person. What are they going through? What have they tried that isn&apos;t working? What&apos;s the painful problem they&apos;re stuck on that you know how to solve? And after they watch your video, what shifts for them, even if it&apos;s small? The more specific you can be about their struggle, the better your content ideas will be.
        </p>
        <textarea
          id="audienceAndProblem"
          value={data.audienceAndProblem}
          onChange={(e) => onChange({ audienceAndProblem: e.target.value })}
          placeholder="Describe the person you're creating for and the problem you solve..."
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

      {/* Q8 */}
      <div className="space-y-2">
        <label
          htmlFor="uniquePerspective"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          What makes your perspective different from everyone else talking about this stuff? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Maybe it&apos;s your background, your personality, how you explain things, or something you went through that shaped your point of view. What do you bring to the conversation that someone else literally can&apos;t?
        </p>
        <textarea
          id="uniquePerspective"
          value={data.uniquePerspective}
          onChange={(e) => onChange({ uniquePerspective: e.target.value })}
          placeholder="What makes your perspective unique?"
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
