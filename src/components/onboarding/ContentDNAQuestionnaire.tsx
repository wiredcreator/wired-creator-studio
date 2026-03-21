'use client';

import { useState, useCallback } from 'react';
import { ContentDNAFormData, INITIAL_FORM_DATA, STEP_LABELS } from '@/types/onboarding';
import ProgressBar from './ProgressBar';
import IdentityStep from './steps/IdentityStep';
import VisionStep from './steps/VisionStep';
import AudienceStep from './steps/AudienceStep';
import NicheStep from './steps/NicheStep';
import InspirationStep from './steps/InspirationStep';
import VoiceSamplesStep from './steps/VoiceSamplesStep';
import ReviewStep from './steps/ReviewStep';

const TOTAL_STEPS = STEP_LABELS.length;

// Validation per step - returns an error message or null
function validateStep(step: number, data: ContentDNAFormData): string | null {
  switch (step) {
    case 0: // Identity
      if (!data.name.trim()) return 'Please enter your name to continue.';
      return null;
    case 1: // Vision
      if (!data.contentGoals.trim()) return 'Share at least a brief note about your content goals.';
      if (!data.twelveWeekVision.trim()) return 'Tell us where you see yourself in 12 weeks.';
      return null;
    case 2: // Audience
      if (!data.idealViewer.trim()) return 'Describe who you are creating for.';
      if (!data.problemsSolved.trim()) return 'Tell us what problems you solve.';
      return null;
    case 3: // Niche
      if (!data.industry.trim()) return 'Enter your industry or niche.';
      if (data.keyTopics.length < 3) return 'Add at least 3 key topics.';
      return null;
    case 4: // Inspiration
      // At least one URL should be filled
      if (!data.inspirations.some((e) => e.url.trim())) {
        return 'Add at least one creator or YouTube URL.';
      }
      return null;
    case 5: // Voice Samples
      // Either skip or provide at least one sample
      if (!data.noExistingContent && !data.voiceSamples.some((s) => s.trim())) {
        return 'Paste at least one content sample, or check "I don\'t have any yet."';
      }
      return null;
    default:
      return null;
  }
}

export default function ContentDNAQuestionnaire() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ContentDNAFormData>(INITIAL_FORM_DATA);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'back'>('forward');

  const updateFormData = useCallback((updates: Partial<ContentDNAFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    // Clear validation when user makes changes
    setValidationMessage(null);
  }, []);

  const goToStep = useCallback((step: number) => {
    setSlideDirection(step > currentStep ? 'forward' : 'back');
    setCurrentStep(step);
    setValidationMessage(null);
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const handleNext = useCallback(() => {
    const error = validateStep(currentStep, formData);
    if (error) {
      setValidationMessage(error);
      return;
    }
    setSlideDirection('forward');
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
    setValidationMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep, formData]);

  const handleBack = useCallback(() => {
    setSlideDirection('back');
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    setValidationMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setValidationMessage(null);

    try {
      const response = await fetch('/api/onboarding/content-dna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setIsComplete(true);
      } else {
        setValidationMessage(result.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setValidationMessage('Could not connect to the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData]);

  // DEV ONLY: Skip onboarding with placeholder data
  const handleSkip = useCallback(async () => {
    setIsSkipping(true);
    setValidationMessage(null);

    const placeholderData: ContentDNAFormData = {
      name: 'test1',
      background: 'test2',
      neurodivergentProfile: ['test3'],
      contentGoals: 'test4',
      twelveWeekVision: 'test5',
      idealViewer: 'test6',
      problemsSolved: 'test7',
      industry: 'test8',
      keyTopics: ['test9', 'test10', 'test11'],
      inspirations: [{ url: 'https://youtube.com/@test12', note: 'test13' }],
      voiceSamples: ['test14'],
      noExistingContent: false,
    };

    try {
      const response = await fetch('/api/onboarding/content-dna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(placeholderData),
      });

      const result = await response.json();

      if (result.success) {
        setIsComplete(true);
      } else {
        setValidationMessage(result.message || 'Skip failed. Please try again.');
      }
    } catch {
      setValidationMessage('Could not connect to the server. Please try again.');
    } finally {
      setIsSkipping(false);
    }
  }, []);

  // Success screen
  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 animate-fadeIn">
        <div
          className="w-16 h-16 flex items-center justify-center mb-6"
          style={{
            backgroundColor: 'var(--color-success-light)',
            borderRadius: 'var(--radius-full)',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-success)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2
          className="text-3xl font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Your Content DNA is captured!
        </h2>
        <p
          className="text-lg max-w-md"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          We are building your personalized Tone of Voice Guide. Your coaching team will review it shortly.
        </p>
        <a
          href="/dashboard/today"
          className="mt-8 inline-block px-8 py-3 text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90"
          style={{
            backgroundColor: 'var(--color-accent)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          Go to Dashboard
        </a>
      </div>
    );
  }

  const isLastStep = currentStep === TOTAL_STEPS - 1;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* DEV ONLY — remove before production */}
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={handleSkip}
          disabled={isSkipping}
          className="px-3 py-1.5 text-xs font-medium rounded border border-dashed transition-colors"
          style={{
            color: 'var(--color-text-muted)',
            borderColor: 'var(--color-border)',
          }}
        >
          {isSkipping ? 'Skipping...' : 'Skip (Dev)'}
        </button>
      </div>

      <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      {/* Step content with transition */}
      <div
        className="min-h-[400px]"
        key={currentStep}
        style={{
          animation: `${slideDirection === 'forward' ? 'slideInRight' : 'slideInLeft'} 0.35s ease-out`,
        }}
      >
        {currentStep === 0 && (
          <IdentityStep data={formData} onChange={updateFormData} />
        )}
        {currentStep === 1 && (
          <VisionStep data={formData} onChange={updateFormData} />
        )}
        {currentStep === 2 && (
          <AudienceStep data={formData} onChange={updateFormData} />
        )}
        {currentStep === 3 && (
          <NicheStep data={formData} onChange={updateFormData} />
        )}
        {currentStep === 4 && (
          <InspirationStep data={formData} onChange={updateFormData} />
        )}
        {currentStep === 5 && (
          <VoiceSamplesStep data={formData} onChange={updateFormData} />
        )}
        {currentStep === 6 && (
          <ReviewStep data={formData} onEditStep={goToStep} />
        )}
      </div>

      {/* Validation message */}
      {validationMessage && (
        <div
          className="mt-6 px-4 py-3 text-sm font-medium text-center animate-fadeIn"
          style={{
            backgroundColor: 'var(--color-warning-light)',
            color: '#946B2D',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {validationMessage}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
        {currentStep > 0 ? (
          <button
            type="button"
            onClick={handleBack}
            className="px-6 py-3 text-base font-medium transition-all duration-200 cursor-pointer"
            style={{
              color: 'var(--color-text-secondary)',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-text-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            Back
          </button>
        ) : (
          <div />
        )}

        {isLastStep ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-8 py-3 text-base font-semibold transition-all duration-200 cursor-pointer"
            style={{
              backgroundColor: isSubmitting
                ? 'var(--color-text-muted)'
                : 'var(--color-accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              opacity: isSubmitting ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Content DNA'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="px-8 py-3 text-base font-semibold transition-all duration-200 cursor-pointer"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
              e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
