'use client';

import { useState, useCallback } from 'react';

// --- Question definitions ---

interface BaselineQuestion {
  id: string;
  question: string;
  helper: string;
}

const STEP_LABELS = [
  'Your Location',
  'Your Schedule',
  'Your Patterns',
  'Your Motivation',
  'Your Wellness',
  'Your Reality',
  'Review',
] as const;

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY',
] as const;

const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
  CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',
  LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',
  MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',
  NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',
  OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',
  WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
};

const QUESTIONS: BaselineQuestion[][] = [
  // Step 1: Your Location (city + state)
  [
    {
      id: 'location-city',
      question: 'What city do you live in?',
      helper: 'This helps us tailor your schedule and content timing to your local area.',
    },
    {
      id: 'location-state',
      question: 'What state are you in?',
      helper: 'We use this to set your timezone automatically.',
    },
  ],
  // Step 2: Your Schedule (Q1-Q3)
  [
    {
      id: 'typical-day',
      question: 'Walk us through a typical weekday and a typical weekend day.',
      helper:
        "When do you wake up? What takes up most of your day? When do you wind down? We don\u2019t need a perfect schedule, just the general shape of both. If weekends are where you\u2019d realistically have the most time for content, we need to know that.",
    },
    {
      id: 'fixed-commitments',
      question: "What commitments in your life right now can\u2019t be moved?",
      helper:
        "Job hours, caregiving, school, a side business, anything that\u2019s locked in.",
    },
    {
      id: 'consistency-blockers',
      question:
        'What keeps getting in the way when you try to stay consistent with something?',
      helper:
        "Not just content. Anything. Exercise, journaling, a project, a habit. What\u2019s the pattern that keeps showing up?",
    },
  ],
  // Step 2: Your Patterns (Q4-Q6)
  [
    {
      id: 'stuck-response',
      question: 'What do you usually do when you feel stuck or overwhelmed?',
      helper:
        "Shut down? Scroll your phone? Switch tasks? Vent to someone? Disappear for a few days? No wrong answer. We just need to know your default so we can plan for it.",
    },
    {
      id: 'adhd-management',
      question:
        'Have you been diagnosed with ADHD, and are you doing anything to manage it right now?',
      helper:
        "Medication, therapy, coaching, self-management strategies, anything counts. If you haven\u2019t been formally diagnosed but suspect it, that\u2019s worth noting too.",
    },
    {
      id: 'past-systems',
      question:
        'What tools or systems have you tried before to stay organized, and what happened?',
      helper:
        'The productivity tool graveyard. Planners, Notion, Trello, calendars, whatever. What did you try and how long did each one last before it fell off?',
    },
  ],
  // Step 3: Your Motivation (Q7-Q9)
  [
    {
      id: 'existing-habits',
      question:
        'Is there anything you\u2019re already consistent with, even if it seems small?',
      helper:
        "Morning coffee, walking the dog, a gym routine, checking your email, a weekly call with a friend. We\u2019re looking for habits that are already locked in because we can use those as anchor points to build your content system around.",
    },
    {
      id: 'motivation-rewards',
      question:
        'What kind of rewards or experiences actually get you going?',
      helper:
        "Some people are motivated by competition. Others by creative freedom or novelty. Some need a deadline breathing down their neck. Some just want to check things off a list. What actually lights you up and makes you want to keep going? And what kind of reward would make you feel like you earned something \u2014 a physical item, an experience, recognition, or something else?",
    },
    {
      id: 'physical-space',
      question: 'What does your physical space look like right now?',
      helper:
        'Where do you work? Where would you likely record content? Do you have a quiet space you can use, or are you sharing walls with roommates, kids, or a partner? Do you have any recording gear already, even just a phone and decent lighting?',
    },
  ],
  // Step 4: Your Wellness (Q10-Q12)
  [
    {
      id: 'phone-relationship',
      question:
        'How\u2019s your relationship with your phone and social media right now?',
      helper:
        "Be honest. How much time do you spend scrolling? Is it the first thing you reach for in the morning? Do you find yourself opening apps without thinking about it? We\u2019re not here to judge your screen time \u2014 we need to know because the shift from consuming content to creating content is one of the biggest transformations in this program, and it helps to know where you\u2019re starting from.",
    },
    {
      id: 'sleep-energy',
      question:
        'How are you sleeping, and how\u2019s your energy throughout the day?',
      helper:
        "Are you getting enough sleep or running on fumes? Do you crash at a certain time every day? Are you exercising, eating well, or is that stuff completely off the rails right now?",
    },
    {
      id: 'accountability-person',
      question:
        'Do you have someone in your life who could check in on you during this program?',
      helper:
        "A friend, a partner, a coworker. Someone who\u2019d notice if you went quiet. If not, totally fine. We\u2019ll build that into the program.",
    },
  ],
  // Step 5: Your Reality (Q13-Q15)
  [
    {
      id: 'upcoming-disruptions',
      question:
        'Is anything going on in your life right now that might make it harder to show up consistently over the next 90 days?',
      helper:
        "A move, a job change, a health thing, a busy season, a relationship situation. We\u2019re not asking you to solve it. We just want to know so we can plan around it.",
    },
    {
      id: 'success-definition',
      question:
        'What does success look like for you at the end of this program?',
      helper:
        'Not what we promised on the sales page. What would make you feel like this was worth it?',
    },
    {
      id: 'anything-else',
      question: 'Anything else you want us to know?',
      helper:
        "How your brain works, what you need, what you\u2019re nervous about. Open floor for anything that didn\u2019t fit above.",
    },
  ],
];

const TOTAL_STEPS = STEP_LABELS.length; // 5 question steps + 1 review

// --- Form data type ---
type BaselineFormData = Record<string, string>;

function getInitialFormData(): BaselineFormData {
  const data: BaselineFormData = {};
  for (const step of QUESTIONS) {
    for (const q of step) {
      data[q.id] = '';
    }
  }
  return data;
}

// --- Component ---

interface PersonalBaselineQuestionnaireProps {
  onComplete?: () => void;
  existingData?: { questionId: string; question: string; answer: string }[] | null;
}

export default function PersonalBaselineQuestionnaire({
  onComplete,
  existingData,
}: PersonalBaselineQuestionnaireProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<BaselineFormData>(() => {
    const initial = getInitialFormData();
    if (existingData) {
      for (const r of existingData) {
        if (r.questionId in initial) {
          initial[r.questionId] = r.answer;
        }
      }
    }
    return initial;
  });
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'back'>('forward');

  const updateField = useCallback((id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
    setValidationMessage(null);
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      setSlideDirection(step > currentStep ? 'forward' : 'back');
      setCurrentStep(step);
      setValidationMessage(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [currentStep]
  );

  const handleNext = useCallback(() => {
    setSlideDirection('forward');
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
    setValidationMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBack = useCallback(() => {
    setSlideDirection('back');
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    setValidationMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setValidationMessage(null);

    // Build responses array
    const responses: { questionId: string; question: string; answer: string }[] = [];
    for (const step of QUESTIONS) {
      for (const q of step) {
        responses.push({
          questionId: q.id,
          question: q.question,
          answer: formData[q.id] || '',
        });
      }
    }

    try {
      const response = await fetch('/api/onboarding/personal-baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      });

      const result = await response.json();

      if (result.success) {
        setIsComplete(true);
        onComplete?.();
      } else {
        setValidationMessage(result.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setValidationMessage('Could not connect to the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onComplete]);

  // --- Success screen ---
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
          Your Personal Baseline is saved!
        </h2>
        <p
          className="text-lg max-w-md"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Your coaching team will use this to build a system that actually fits your life. No cookie-cutter plans here.
        </p>
        {!onComplete && (
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
        )}
      </div>
    );
  }

  const isReviewStep = currentStep === TOTAL_STEPS - 1;
  const isLastStep = isReviewStep;
  const progress = ((currentStep + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="w-full max-w-2xl mx-auto mb-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Step {currentStep + 1} of {TOTAL_STEPS}
          </span>
          <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
            {STEP_LABELS[currentStep]}
          </span>
        </div>

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

        <div className="flex justify-between mt-3 px-1">
          {STEP_LABELS.map((label, index) => (
            <div
              key={label}
              className="flex flex-col items-center"
              style={{ width: `${100 / TOTAL_STEPS}%` }}
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

      {/* Step content */}
      <div
        className="min-h-[400px]"
        key={currentStep}
      >
        {isReviewStep ? (
          <ReviewStep formData={formData} onEditStep={goToStep} />
        ) : (
          <QuestionStep
            stepIndex={currentStep}
            questions={QUESTIONS[currentStep]}
            formData={formData}
            onChange={updateField}
          />
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
      <div
        className="flex items-center justify-between mt-10 pt-6 border-t"
        style={{ borderColor: 'var(--color-border-light)' }}
      >
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
            {isSubmitting ? 'Submitting...' : 'Submit Personal Baseline'}
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

// --- Question Step ---

const STEP_HEADINGS: { title: string; subtitle: string }[] = [
  {
    title: 'Your Location',
    subtitle: 'Where in the world are you based?',
  },
  {
    title: 'Your Schedule',
    subtitle: 'Help us understand the shape of your days.',
  },
  {
    title: 'Your Patterns',
    subtitle: 'How your brain works when things get hard.',
  },
  {
    title: 'Your Motivation',
    subtitle: 'What keeps you going and where you do it.',
  },
  {
    title: 'Your Wellness',
    subtitle: 'Energy, sleep, and the people around you.',
  },
  {
    title: 'Your Reality',
    subtitle: "What\u2019s actually going on in your life right now.",
  },
];

function QuestionStep({
  stepIndex,
  questions,
  formData,
  onChange,
}: {
  stepIndex: number;
  questions: BaselineQuestion[];
  formData: BaselineFormData;
  onChange: (id: string, value: string) => void;
}) {
  const heading = STEP_HEADINGS[stepIndex];

  return (
    <div className="space-y-8">
      <div className="text-center mb-10">
        <h2
          className="text-3xl font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {heading.title}
        </h2>
        <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
          {heading.subtitle}
        </p>
      </div>

      {/* Purpose banner - only on schedule step */}
      {stepIndex === 1 && (
        <div
          className="px-5 py-4 text-sm leading-relaxed"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border-light)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <p className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
            This helps us understand your actual life so we can build a system that fits it.
          </p>
          <p>
            The more honest you are, the better we can coach you. Nothing here gets judged.
          </p>
          <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>
            8-10 minutes &middot; Short answers &middot; A few sentences per question is perfect
          </p>
        </div>
      )}

      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <label
            htmlFor={q.id}
            className="block text-base font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {q.question}
          </label>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {q.helper}
          </p>
          {q.id === 'location-state' ? (
            <select
              id={q.id}
              value={formData[q.id]}
              onChange={(e) => onChange(q.id, e.target.value)}
              className="w-full px-4 py-3 text-base border transition-colors duration-200 outline-none"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                borderColor: 'var(--color-border)',
                color: formData[q.id] ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                borderRadius: 'var(--radius-md)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            >
              <option value="">Select your state</option>
              {US_STATES.map((abbr) => (
                <option key={abbr} value={abbr}>
                  {STATE_NAMES[abbr]} ({abbr})
                </option>
              ))}
            </select>
          ) : q.id === 'location-city' ? (
            <input
              id={q.id}
              type="text"
              value={formData[q.id]}
              onChange={(e) => onChange(q.id, e.target.value)}
              placeholder="e.g. Austin"
              className="w-full px-4 py-3 text-base border transition-colors duration-200 outline-none"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
                borderRadius: 'var(--radius-md)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
          ) : (
            <textarea
              id={q.id}
              value={formData[q.id]}
              onChange={(e) => onChange(q.id, e.target.value)}
              rows={4}
              className="w-full px-4 py-3 text-base border transition-colors duration-200 resize-none outline-none"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
                borderRadius: 'var(--radius-md)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// --- Review Step ---

function ReviewStep({
  formData,
  onEditStep,
}: {
  formData: BaselineFormData;
  onEditStep: (step: number) => void;
}) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-10">
        <h2
          className="text-3xl font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Review your Personal Baseline
        </h2>
        <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
          Everything look good? You can edit any section before submitting.
        </p>
      </div>

      {QUESTIONS.map((stepQuestions, stepIndex) => (
        <div
          key={stepIndex}
          className="p-5 border transition-all duration-200"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            borderColor: 'var(--color-border-light)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3
              className="text-base font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {STEP_LABELS[stepIndex]}
            </h3>
            <button
              type="button"
              onClick={() => onEditStep(stepIndex)}
              className="text-sm font-medium transition-opacity hover:opacity-80 cursor-pointer"
              style={{
                color: 'var(--color-accent)',
                border: 'none',
                background: 'none',
                padding: 0,
              }}
            >
              Edit
            </button>
          </div>

          {stepQuestions.map((q) => {
            const value = formData[q.id];
            return (
              <div key={q.id} className="mb-3 last:mb-0">
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {q.question}
                </span>
                <p
                  className="text-base mt-0.5 whitespace-pre-wrap"
                  style={{
                    color: value
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-muted)',
                  }}
                >
                  {value || 'Not answered'}
                </p>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
