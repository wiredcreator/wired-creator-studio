'use client';

import { useState, useCallback } from 'react';
import { ContentDNAFormData, INITIAL_FORM_DATA, STEP_LABELS } from '@/types/onboarding';
import ProgressBar from './ProgressBar';
import IdentityStep from './steps/IdentityStep';
import VisionStep from './steps/VisionStep';
import AudienceStep from './steps/AudienceStep';
import NicheStep from './steps/NicheStep';
import VoiceSamplesStep from './steps/VoiceSamplesStep';
import InspirationStep from './steps/InspirationStep';
import CoreMessageStep from './steps/CoreMessageStep';
import ReviewStep from './steps/ReviewStep';

const TOTAL_STEPS = STEP_LABELS.length;

// Validation per step - returns an error message or null
function validateStep(step: number, data: ContentDNAFormData): string | null {
  switch (step) {
    case 0: // Your Story (Q1-Q3)
      if (!data.yourStory.trim()) return 'Tell us about what you do and how you got here.';
      if (!data.winsAndMilestones.trim()) return 'Share at least a few wins or milestones.';
      if (!data.contentGoal.trim()) return 'Tell us what you want your content to lead to.';
      return null;
    case 1: // Your Business (Q4-Q5)
      if (!data.offerAndContent.trim()) return 'Tell us about what you sell or plan to sell.';
      if (!data.goToPersonFor.trim()) return 'Tell us what people come to you for.';
      return null;
    case 2: // Your Passion (Q6-Q8)
      if (!data.talkWithoutPreparing.trim()) return 'Tell us what you could talk about for 30 minutes.';
      if (!data.audienceAndProblem.trim()) return 'Describe your audience and the problem you solve.';
      if (!data.uniquePerspective.trim()) return 'Tell us what makes your perspective different.';
      return null;
    case 3: // Your Stories (Q9-Q10)
      if (!data.personalStories.trim()) return 'Share at least a couple personal stories.';
      if (!data.knownForAndAgainst.trim()) return 'Tell us what you want to be known for and against.';
      return null;
    case 4: // Your History (Q11-Q13)
      if (!data.contentHistory.trim()) return 'Tell us about your content creation history.';
      if (!data.timeAndEnergy.trim()) return 'Share how much time and energy you have for content.';
      if (!data.easyVsDraining.trim()) return 'Tell us what feels easy vs. draining.';
      return null;
    case 5: // Your Inspiration (Q14-Q15)
      if (!data.inspirations.some((e) => e.url.trim())) {
        return 'Add at least one creator or YouTube URL.';
      }
      if (!data.naturalFormat.trim()) return 'Tell us what format feels most natural for you.';
      return null;
    case 6: // Your Core Message (Q16)
      if (!data.coreMessage.trim()) return 'Share your core message.';
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
      yourStory: 'Test story about my journey',
      winsAndMilestones: 'Test wins and milestones',
      contentGoal: 'Test content goal',
      offerAndContent: 'Test offer description',
      goToPersonFor: 'Test go-to expertise',
      talkWithoutPreparing: 'Test passionate topics',
      audienceAndProblem: 'Test audience and problem',
      uniquePerspective: 'Test unique perspective',
      personalStories: 'Test personal stories',
      knownForAndAgainst: 'Test known for and against',
      contentHistory: 'Test content history',
      timeAndEnergy: 'Test time and energy',
      easyVsDraining: 'Test easy vs draining',
      inspirations: [{ url: 'https://youtube.com/@test', note: 'Test note' }],
      naturalFormat: 'Test format preference',
      coreMessage: 'Test core message',
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
          <VoiceSamplesStep data={formData} onChange={updateFormData} />
        )}
        {currentStep === 5 && (
          <InspirationStep data={formData} onChange={updateFormData} />
        )}
        {currentStep === 6 && (
          <CoreMessageStep data={formData} onChange={updateFormData} />
        )}
        {currentStep === 7 && (
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
