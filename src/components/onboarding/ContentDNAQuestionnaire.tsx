'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ContentDNAFormData, INITIAL_FORM_DATA, STEP_LABELS } from '@/types/onboarding';
import ProgressBar from './ProgressBar';
import QuestionStep, { QuestionConfig } from './QuestionStep';
import InspirationStep from './steps/InspirationStep';
import ReviewStep from './steps/ReviewStep';

const TOTAL_STEPS = STEP_LABELS.length;
const DRAFT_KEY = 'wc-content-dna-draft';
const DRAFT_STEP_KEY = 'wc-content-dna-step';

// All single-question steps defined as data.
// InspirationStep (step 14) and ReviewStep (step 16) are special and rendered separately.
const QUESTIONS: QuestionConfig[] = [
  {
    fieldKey: 'yourStory',
    stepTitle: 'Your Story',
    stepSubtitle: '15-20 minutes. Long-form answers. Voice-to-text is encouraged.',
    label: 'What do you do and how did you end up here?',
    helperText:
      'Tell us about your work, your business, or whatever you spend most of your energy building. The messy path, the wins and failures, the stuff that actually got you to where you are now.',
    placeholder: 'Tell us your story...',
    required: true,
  },
  {
    fieldKey: 'winsAndMilestones',
    stepTitle: 'Wins & Milestones',
    stepSubtitle: 'The credibility bank that gives your content weight.',
    label: 'What are the biggest wins, results, or milestones you can point to?',
    helperText:
      "Numbers, outcomes, things you've built, problems you've solved, clients you've helped. Even small ones count. If you're earlier in your journey, tell us what you're actively studying, experimenting with, or working toward becoming the person who knows this stuff. This becomes your credibility bank.",
    placeholder: 'Share your wins and milestones...',
    required: true,
  },
  {
    fieldKey: 'contentGoal',
    stepTitle: 'Content Goal',
    stepSubtitle: 'What does success actually look like for you?',
    label: 'What do you want your content to actually lead to?',
    helperText:
      'Not "get more followers." What\'s the real outcome you\'re after? Maybe it\'s filling your coaching program. Maybe it\'s landing speaking gigs. Maybe it\'s quitting your job in 12 months. If your content worked exactly the way you wanted it to, what changes in your life or business?',
    placeholder: "What's the real outcome you're after?",
    required: true,
  },
  {
    fieldKey: 'offerAndContent',
    stepTitle: 'Your Offer',
    stepSubtitle: 'Help us understand what you\'re building and how content fits in.',
    label: 'What do you sell or plan to sell, and how does content connect to that?',
    helperText:
      "Tell us about your offer, your service, your product, whatever it is. If you don't have one yet, tell us what you're working toward. We need to understand this because your content strategy should be built to drive people toward your thing, not just get views.",
    placeholder: 'Describe your offer and how content connects to it...',
    required: true,
  },
  {
    fieldKey: 'goToPersonFor',
    stepTitle: 'Go-To Person',
    stepSubtitle: 'The thing people naturally come to you for.',
    label: 'What do people always come to you for?',
    helperText:
      'Think about the questions friends, coworkers, or clients keep asking you. The stuff people DM you about. The thing someone once said "you should make content about that." What do you naturally become the go-to person for?',
    placeholder: 'What do people always come to you for?',
    required: true,
  },
  {
    fieldKey: 'talkWithoutPreparing',
    stepTitle: 'Your Fire Topics',
    stepSubtitle: 'What fires you up and keeps you talking?',
    label: 'What could you talk about for 30 minutes without preparing?',
    helperText:
      'Not what you think you should talk about. What actually fires you up. The topics where you lose track of time and catch yourself mid-rant. List as many as come to mind.',
    placeholder: 'What topics fire you up?',
    required: true,
  },
  {
    fieldKey: 'audienceAndProblem',
    stepTitle: 'Your Audience',
    stepSubtitle: 'Who are you here to help, and what are they stuck on?',
    label: 'Who do you want your content to reach, and what painful problem are you solving for them?',
    helperText:
      "Describe them like a real person. What are they going through? What have they tried that isn't working? What's the painful problem they're stuck on that you know how to solve? And after they watch your video, what shifts for them, even if it's small? The more specific you can be about their struggle, the better your content ideas will be.",
    placeholder:
      "Describe the person you're creating for and the problem you solve...",
    required: true,
  },
  {
    fieldKey: 'uniquePerspective',
    stepTitle: 'Your Perspective',
    stepSubtitle: 'What makes your take different from everyone else?',
    label: 'What makes your perspective different from everyone else talking about this stuff?',
    helperText:
      "Maybe it's your background, your personality, how you explain things, or something you went through that shaped your point of view. What do you bring to the conversation that someone else literally can't?",
    placeholder: 'What makes your perspective unique?',
    required: true,
  },
  {
    fieldKey: 'personalStories',
    stepTitle: 'Your Stories',
    stepSubtitle: 'The experiences that make your content yours.',
    label: 'What are 2 or 3 personal stories that shaped who you are today?',
    helperText:
      "They don't need to be dramatic. A turning point, a failure, a moment of clarity, something funny that taught you something real. Stories are what make content stick. We want to know which ones are yours to tell.",
    placeholder: 'Share 2-3 personal stories that shaped you...',
    required: true,
    rows: 6,
  },
  {
    fieldKey: 'knownForAndAgainst',
    stepTitle: 'Known For & Against',
    stepSubtitle: 'The ideas you will repeat through every piece of content.',
    label: 'What do you want to be known FOR, and what do you want to be known AGAINST?',
    helperText:
      'Give us two of each. The "for" is what you want people to associate with your name every time they see your content. The "against" is the stuff in your industry that you reject, disagree with, or refuse to do. These become the ideas you\'ll repeat over and over through different stories and scenarios.',
    placeholder: 'Known FOR: ...\nKnown AGAINST: ...',
    required: true,
    rows: 6,
  },
  {
    fieldKey: 'contentHistory',
    stepTitle: 'Content History',
    stepSubtitle: "Where you've been so we know what to build differently.",
    label: 'Have you tried making content before? What happened?',
    helperText:
      "Tell us what you actually did, how far you got, what the process looked like, and where it fell apart. Did you burn out? Overthink everything? Run out of ideas? Get stuck in editing? If you've never tried, what's been stopping you? No judgment here. We need to know what hasn't worked so we don't build you the same thing again.",
    placeholder: 'Tell us about your content creation history...',
    required: true,
  },
  {
    fieldKey: 'timeAndEnergy',
    stepTitle: 'Time & Energy',
    stepSubtitle: 'The honest number, not the aspirational one.',
    label: 'How much time and energy do you realistically have for content?',
    helperText:
      "Not the aspirational number, the honest one, given everything else going on in your life. How many hours a week can you actually give to this? When are you sharpest during the day, morning, afternoon, or night?",
    placeholder: 'Be honest about your available time and energy...',
    required: true,
  },
  {
    fieldKey: 'easyVsDraining',
    stepTitle: 'Easy vs. Draining',
    stepSubtitle: 'We will build your workflow around what gives you energy.',
    label: "What parts of making content feel easy to you, and what parts feel like they'd drain you?",
    helperText:
      "Think about the whole process: brainstorming ideas, writing or scripting, talking on camera, recording audio, editing, posting. Which parts give you energy and which ones make you want to quit before you start?",
    placeholder: 'What feels easy vs. draining about content creation?',
    required: true,
  },
  {
    fieldKey: 'writtenSamples',
    stepTitle: 'Writing Samples',
    stepSubtitle: 'Totally optional, but helps us capture your natural voice.',
    label: 'Have existing content? Paste a few examples below.',
    helperText:
      'Blog posts, social captions, past scripts, newsletters, emails to your audience. Anything you have written in your own voice. This helps us capture how you naturally communicate, even better. Paste multiple samples separated by a blank line.',
    placeholder:
      'Paste your writing samples here. Separate multiple samples with a blank line...',
    required: false,
    rows: 8,
  },
  // Step 14 is InspirationStep (special UI) - not in this array
  // Step 15 is coreMessage
];

// coreMessage is rendered as a single question step after InspirationStep
const CORE_MESSAGE_QUESTION: QuestionConfig = {
  fieldKey: 'coreMessage',
  stepTitle: 'Your Core Message',
  stepSubtitle: 'The thread that ties everything together.',
  label: 'If someone watched all your content and walked away with one core message about you, what would you want it to be?',
  helperText:
    'Not a tagline. The thread that ties everything together. The thing that makes someone say "that\'s what they\'re about."',
  placeholder: "What's the one core message you want people to take away?",
  required: true,
};

// Step mapping:
// 0-13: single question steps (QUESTIONS array indices 0-13)
// 14: InspirationStep (special UI)
// 15: coreMessage
// 16: ReviewStep

const INSPIRATION_STEP = 14;
const CORE_MESSAGE_STEP = 15;
const REVIEW_STEP = 16;

function saveDraftToStorage(data: ContentDNAFormData, step: number) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    localStorage.setItem(DRAFT_STEP_KEY, String(step));
  } catch {
    // Storage full or unavailable, silently ignore
  }
}

function loadDraftFromStorage(): { data: ContentDNAFormData; step: number } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ContentDNAFormData;
    const step = parseInt(localStorage.getItem(DRAFT_STEP_KEY) || '0', 10);
    return { data, step };
  } catch {
    return null;
  }
}

function clearDraftFromStorage() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_STEP_KEY);
  } catch {
    // Silently ignore
  }
}

function validateStep(step: number, data: ContentDNAFormData): string | null {
  if (step < QUESTIONS.length) {
    const q = QUESTIONS[step];
    if (q.required && !(data[q.fieldKey as keyof ContentDNAFormData] as string).trim()) {
      return `Please fill in this question before continuing.`;
    }
    return null;
  }

  if (step === INSPIRATION_STEP) {
    if (!data.inspirations.some((e) => e.url.trim())) {
      return 'Add at least one creator or YouTube URL.';
    }
    if (!data.naturalFormat.trim()) {
      return 'Tell us what format feels most natural for you.';
    }
    return null;
  }

  if (step === CORE_MESSAGE_STEP) {
    if (!data.coreMessage.trim()) return 'Share your core message.';
    return null;
  }

  return null;
}

interface ContentDNAQuestionnaireProps {
  existingData?: Partial<ContentDNAFormData> | null;
}

export default function ContentDNAQuestionnaire({ existingData }: ContentDNAQuestionnaireProps = {}) {
  const [currentStep, setCurrentStep] = useState(() => {
    if (existingData && Object.values(existingData).some((v) => typeof v === 'string' ? v.trim() : v)) {
      return 0;
    }
    const draft = loadDraftFromStorage();
    return draft ? draft.step : 0;
  });
  const [formData, setFormData] = useState<ContentDNAFormData>(() => {
    const initial = { ...INITIAL_FORM_DATA };
    const draft = loadDraftFromStorage();
    const base = draft ? { ...initial, ...draft.data } : initial;
    if (existingData) {
      return { ...base, ...existingData };
    }
    return base;
  });
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'back'>('forward');
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);

  const isDirtyRef = useRef(false);
  const formDataRef = useRef(formData);
  const currentStepRef = useRef(currentStep);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // Auto-save every 3 seconds if dirty
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirtyRef.current) {
        saveDraftToStorage(formDataRef.current, currentStepRef.current);
        isDirtyRef.current = false;
        setDraftSavedAt(new Date());
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleContainerBlur = useCallback(() => {
    if (isDirtyRef.current) {
      saveDraftToStorage(formDataRef.current, currentStepRef.current);
      isDirtyRef.current = false;
      setDraftSavedAt(new Date());
    }
  }, []);

  const updateFormData = useCallback((updates: Partial<ContentDNAFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    isDirtyRef.current = true;
    setValidationMessage(null);
  }, []);

  const goToStep = useCallback((step: number) => {
    setSlideDirection(step > currentStep ? 'forward' : 'back');
    setCurrentStep(step);
    setValidationMessage(null);
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
    // Save draft on step change
    saveDraftToStorage(formData, currentStep + 1);
    isDirtyRef.current = false;
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
        clearDraftFromStorage();
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
          We are building your personalized Tone of Voice Guide. One more quick step before you are in.
        </p>
        <a
          href="/onboarding/personal-baseline"
          className="mt-8 inline-block px-8 py-3 text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90"
          style={{
            backgroundColor: 'var(--color-accent)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          Continue to Personal Baseline
        </a>
      </div>
    );
  }

  const isLastStep = currentStep === TOTAL_STEPS - 1;

  // Render the current step content
  const renderStepContent = () => {
    // Single-question steps (0-13)
    if (currentStep < QUESTIONS.length) {
      const question = QUESTIONS[currentStep];
      const fieldKey = question.fieldKey as keyof ContentDNAFormData;
      return (
        <QuestionStep
          question={question}
          value={formData[fieldKey] as string}
          onChange={(val) => updateFormData({ [fieldKey]: val })}
        />
      );
    }

    // Inspiration step (special UI with URLs + naturalFormat)
    if (currentStep === INSPIRATION_STEP) {
      return <InspirationStep data={formData} onChange={updateFormData} />;
    }

    // Core message step
    if (currentStep === CORE_MESSAGE_STEP) {
      return (
        <QuestionStep
          question={CORE_MESSAGE_QUESTION}
          value={formData.coreMessage}
          onChange={(val) => updateFormData({ coreMessage: val })}
        />
      );
    }

    // Review step
    if (currentStep === REVIEW_STEP) {
      return <ReviewStep data={formData} onEditStep={goToStep} />;
    }

    return null;
  };

  return (
    <div className="w-full max-w-2xl mx-auto" onBlurCapture={handleContainerBlur}>
      <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      {/* Step content with transition */}
      <div
        className="min-h-[400px]"
        key={currentStep}
        style={{
          animation: `${slideDirection === 'forward' ? 'slideInRight' : 'slideInLeft'} 0.35s ease-out forwards`,
        }}
      >
        {renderStepContent()}
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

      {/* Draft saved indicator */}
      {draftSavedAt && (
        <p
          className="text-xs mt-4 text-right transition-opacity duration-500"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Draft saved
        </p>
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
