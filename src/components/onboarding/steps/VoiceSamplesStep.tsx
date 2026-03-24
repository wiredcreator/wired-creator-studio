'use client';

import { ContentDNAFormData } from '@/types/onboarding';

interface YourHistoryStepProps {
  data: ContentDNAFormData;
  onChange: (updates: Partial<ContentDNAFormData>) => void;
}

export default function VoiceSamplesStep({ data, onChange }: YourHistoryStepProps) {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center mb-10">
        <h2
          className="text-3xl font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Your History
        </h2>
        <p
          className="text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Where you&apos;ve been with content so we know what to build differently.
        </p>
      </div>

      {/* Q11 */}
      <div className="space-y-2">
        <label
          htmlFor="contentHistory"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Have you tried making content before? What happened? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Tell us what you actually did — how far you got, what the process looked like, and where it fell apart. Did you burn out? Overthink everything? Run out of ideas? Get stuck in editing? If you&apos;ve never tried, what&apos;s been stopping you? No judgment here. We need to know what hasn&apos;t worked so we don&apos;t build you the same thing again.
        </p>
        <textarea
          id="contentHistory"
          value={data.contentHistory}
          onChange={(e) => onChange({ contentHistory: e.target.value })}
          placeholder="Tell us about your content creation history..."
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

      {/* Q12 */}
      <div className="space-y-2">
        <label
          htmlFor="timeAndEnergy"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          How much time and energy do you realistically have for content? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Not the aspirational number — the honest one, given everything else going on in your life. How many hours a week can you actually give to this? When are you sharpest during the day — morning, afternoon, or night?
        </p>
        <textarea
          id="timeAndEnergy"
          value={data.timeAndEnergy}
          onChange={(e) => onChange({ timeAndEnergy: e.target.value })}
          placeholder="Be honest about your available time and energy..."
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

      {/* Q13 */}
      <div className="space-y-2">
        <label
          htmlFor="easyVsDraining"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          What parts of making content feel easy to you, and what parts feel like they&apos;d drain you? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Think about the whole process — brainstorming ideas, writing or scripting, talking on camera, recording audio, editing, posting. Which parts give you energy and which ones make you want to quit before you start?
        </p>
        <textarea
          id="easyVsDraining"
          value={data.easyVsDraining}
          onChange={(e) => onChange({ easyVsDraining: e.target.value })}
          placeholder="What feels easy vs. draining about content creation?"
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
