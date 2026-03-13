'use client';

import { STEP_LABELS } from '@/types/onboarding';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto mb-10">
      {/* Step label */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Step {currentStep + 1} of {totalSteps}
        </span>
        <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
          {STEP_LABELS[currentStep]}
        </span>
      </div>

      {/* Progress track */}
      <div
        className="w-full h-2 overflow-hidden"
        style={{
          backgroundColor: 'var(--color-border-light)',
          borderRadius: 'var(--radius-full)',
        }}
      >
        <div
          className="h-full"
          style={{
            width: `${progress}%`,
            backgroundColor: 'var(--color-accent)',
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>

      {/* Step dots */}
      <div className="flex justify-between mt-3 px-1">
        {STEP_LABELS.map((label, index) => (
          <div
            key={label}
            className="flex flex-col items-center"
            style={{ width: `${100 / totalSteps}%` }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full transition-all duration-300"
              style={{
                backgroundColor:
                  index <= currentStep
                    ? 'var(--color-accent)'
                    : 'var(--color-border)',
                transform: index === currentStep ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
