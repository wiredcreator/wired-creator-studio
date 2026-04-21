'use client';

import { ContentDNAFormData } from '@/types/onboarding';
import VoiceInputWrapper from '@/components/VoiceInputWrapper';

interface YourStoryStepProps {
  data: ContentDNAFormData;
  onChange: (updates: Partial<ContentDNAFormData>) => void;
}

export default function IdentityStep({ data, onChange }: YourStoryStepProps) {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center mb-10">
        <h2
          className="text-3xl font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Your Story
        </h2>
        <p
          className="text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          15-20 minutes. Long-form answers. Voice-to-text is encouraged.
        </p>
      </div>

      {/* Q1 */}
      <div className="space-y-2">
        <label
          htmlFor="yourStory"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          What do you do and how did you end up here? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Tell us about your work, your business, or whatever you spend most of your energy building. The messy path, the wins and failures, the stuff that actually got you to where you are now.
        </p>
        <VoiceInputWrapper onTranscript={(text) => onChange({ yourStory: data.yourStory ? data.yourStory + '\n' + text : text })}>
        <textarea
          id="yourStory"
          value={data.yourStory}
          onChange={(e) => onChange({ yourStory: e.target.value })}
          placeholder="Tell us your story..."
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
        </VoiceInputWrapper>
      </div>

      {/* Q2 */}
      <div className="space-y-2">
        <label
          htmlFor="winsAndMilestones"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          What are the biggest wins, results, or milestones you can point to? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Numbers, outcomes, things you&apos;ve built, problems you&apos;ve solved, clients you&apos;ve helped. Even small ones count. If you&apos;re earlier in your journey, tell us what you&apos;re actively studying, experimenting with, or working toward becoming the person who knows this stuff. This becomes your credibility bank — it&apos;s what gives your content weight.
        </p>
        <VoiceInputWrapper onTranscript={(text) => onChange({ winsAndMilestones: data.winsAndMilestones ? data.winsAndMilestones + '\n' + text : text })}>
        <textarea
          id="winsAndMilestones"
          value={data.winsAndMilestones}
          onChange={(e) => onChange({ winsAndMilestones: e.target.value })}
          placeholder="Share your wins and milestones..."
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
        </VoiceInputWrapper>
      </div>

      {/* Q3 */}
      <div className="space-y-2">
        <label
          htmlFor="contentGoal"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          What do you want your content to actually lead to? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Not &quot;get more followers.&quot; What&apos;s the real outcome you&apos;re after? Maybe it&apos;s filling your coaching program. Maybe it&apos;s landing speaking gigs. Maybe it&apos;s quitting your job in 12 months. If your content worked exactly the way you wanted it to, what changes in your life or business?
        </p>
        <VoiceInputWrapper onTranscript={(text) => onChange({ contentGoal: data.contentGoal ? data.contentGoal + '\n' + text : text })}>
        <textarea
          id="contentGoal"
          value={data.contentGoal}
          onChange={(e) => onChange({ contentGoal: e.target.value })}
          placeholder="What's the real outcome you're after?"
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
        </VoiceInputWrapper>
      </div>
    </div>
  );
}
