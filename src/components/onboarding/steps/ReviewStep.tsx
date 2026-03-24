'use client';

import { ContentDNAFormData, STEP_LABELS } from '@/types/onboarding';

interface ReviewStepProps {
  data: ContentDNAFormData;
  onEditStep: (step: number) => void;
}

function SectionCard({
  title,
  stepIndex,
  onEdit,
  children,
}: {
  title: string;
  stepIndex: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div
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
          {title}
        </h3>
        <button
          type="button"
          onClick={() => onEdit(stepIndex)}
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
      {children}
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="mb-3 last:mb-0">
      <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <p className="text-base mt-0.5 whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </p>
    </div>
  );
}

export default function ReviewStep({ data, onEditStep }: ReviewStepProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-10">
        <h2
          className="text-3xl font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Review your Content DNA
        </h2>
        <p
          className="text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Everything look good? You can edit any section before submitting.
        </p>
      </div>

      {/* Step 1: Your Story */}
      <SectionCard title={STEP_LABELS[0]} stepIndex={0} onEdit={onEditStep}>
        <ReviewField label="What you do and how you got here" value={data.yourStory} />
        <ReviewField label="Biggest wins and milestones" value={data.winsAndMilestones} />
        <ReviewField label="What you want content to lead to" value={data.contentGoal} />
      </SectionCard>

      {/* Step 2: Your Business */}
      <SectionCard title={STEP_LABELS[1]} stepIndex={1} onEdit={onEditStep}>
        <ReviewField label="What you sell and how content connects" value={data.offerAndContent} />
        <ReviewField label="What people come to you for" value={data.goToPersonFor} />
      </SectionCard>

      {/* Step 3: Your Passion */}
      <SectionCard title={STEP_LABELS[2]} stepIndex={2} onEdit={onEditStep}>
        <ReviewField label="What you could talk about for 30 minutes" value={data.talkWithoutPreparing} />
        <ReviewField label="Your audience and their painful problem" value={data.audienceAndProblem} />
        <ReviewField label="Your unique perspective" value={data.uniquePerspective} />
      </SectionCard>

      {/* Step 4: Your Stories */}
      <SectionCard title={STEP_LABELS[3]} stepIndex={3} onEdit={onEditStep}>
        <ReviewField label="Personal stories that shaped you" value={data.personalStories} />
        <ReviewField label="Known for and against" value={data.knownForAndAgainst} />
      </SectionCard>

      {/* Step 5: Your History */}
      <SectionCard title={STEP_LABELS[4]} stepIndex={4} onEdit={onEditStep}>
        <ReviewField label="Content creation history" value={data.contentHistory} />
        <ReviewField label="Time and energy for content" value={data.timeAndEnergy} />
        <ReviewField label="Easy vs. draining parts" value={data.easyVsDraining} />
      </SectionCard>

      {/* Step 6: Your Inspiration */}
      <SectionCard title={STEP_LABELS[5]} stepIndex={5} onEdit={onEditStep}>
        {data.inspirations.filter((e) => e.url.trim()).length > 0 ? (
          data.inspirations
            .filter((e) => e.url.trim())
            .map((entry, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <p className="text-base" style={{ color: 'var(--color-text-primary)' }}>
                  {entry.url}
                </p>
                {entry.note && (
                  <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {entry.note}
                  </p>
                )}
              </div>
            ))
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No creators added yet.
          </p>
        )}
        <ReviewField label="Most natural format" value={data.naturalFormat} />
      </SectionCard>

      {/* Step 7: Your Core Message */}
      <SectionCard title={STEP_LABELS[6]} stepIndex={6} onEdit={onEditStep}>
        <ReviewField label="Core message" value={data.coreMessage} />
      </SectionCard>
    </div>
  );
}
