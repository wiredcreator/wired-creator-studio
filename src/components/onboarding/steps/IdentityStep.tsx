'use client';

import { ContentDNAFormData, NEURODIVERGENT_OPTIONS } from '@/types/onboarding';

interface IdentityStepProps {
  data: ContentDNAFormData;
  onChange: (updates: Partial<ContentDNAFormData>) => void;
}

export default function IdentityStep({ data, onChange }: IdentityStepProps) {
  const toggleNeurodivergent = (option: string) => {
    const current = data.neurodivergentProfile;

    // "Prefer not to say" is exclusive
    if (option === 'Prefer not to say') {
      onChange({
        neurodivergentProfile: current.includes(option) ? [] : [option],
      });
      return;
    }

    // Remove "Prefer not to say" when selecting something else
    const filtered = current.filter((o) => o !== 'Prefer not to say');

    if (filtered.includes(option)) {
      onChange({ neurodivergentProfile: filtered.filter((o) => o !== option) });
    } else {
      onChange({ neurodivergentProfile: [...filtered, option] });
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center mb-10">
        <h2
          className="text-3xl font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Let&apos;s get to know you
        </h2>
        <p
          className="text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Just the basics to start your journey.
        </p>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <label
          htmlFor="name"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          What should we call you? <span style={{ color: 'var(--color-warning)' }}>*</span>
        </label>
        <input
          id="name"
          type="text"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Your name"
          className="w-full px-4 py-3 text-base rounded-lg border transition-colors duration-200"
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

      {/* Background */}
      <div className="space-y-2">
        <label
          htmlFor="background"
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Tell us a bit about yourself
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Your profession, passions, or anything that describes who you are.
        </p>
        <textarea
          id="background"
          value={data.background}
          onChange={(e) => onChange({ background: e.target.value })}
          placeholder="E.g., I'm a nutritionist who runs a private practice and loves teaching people about gut health..."
          rows={3}
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

      {/* Neurodivergent Profile */}
      <div className="space-y-3">
        <label
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Do any of these resonate with you?
        </label>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Totally optional. This helps us personalize your experience.
        </p>
        <div className="flex flex-wrap gap-3 mt-2">
          {NEURODIVERGENT_OPTIONS.map((option) => {
            const isSelected = data.neurodivergentProfile.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleNeurodivergent(option)}
                className="px-4 py-2.5 text-sm font-medium border transition-all duration-200 cursor-pointer"
                style={{
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: isSelected
                    ? 'var(--color-accent-light)'
                    : 'var(--color-bg-card)',
                  borderColor: isSelected
                    ? 'var(--color-accent)'
                    : 'var(--color-border)',
                  color: isSelected
                    ? 'var(--color-accent-hover)'
                    : 'var(--color-text-secondary)',
                }}
              >
                {isSelected && (
                  <span className="mr-1.5">&#10003;</span>
                )}
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
