'use client';

import { ContentDNAFormData } from '@/types/onboarding';

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

// Step index mapping for "Edit" buttons (one question per screen):
// 0: yourStory, 1: winsAndMilestones, 2: contentGoal
// 3: offerAndContent, 4: goToPersonFor
// 5: talkWithoutPreparing, 6: audienceAndProblem, 7: uniquePerspective
// 8: personalStories, 9: knownForAndAgainst
// 10: contentHistory, 11: timeAndEnergy, 12: easyVsDraining, 13: writtenSamples
// 14: InspirationStep (inspirations + naturalFormat)
// 15: coreMessage

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

      {/* Your Story */}
      <SectionCard title="Your Story" stepIndex={0} onEdit={onEditStep}>
        <ReviewField label="What you do and how you got here" value={data.yourStory} />
      </SectionCard>

      {/* Wins & Milestones */}
      <SectionCard title="Wins & Milestones" stepIndex={1} onEdit={onEditStep}>
        <ReviewField label="Biggest wins and milestones" value={data.winsAndMilestones} />
      </SectionCard>

      {/* Content Goal */}
      <SectionCard title="Content Goal" stepIndex={2} onEdit={onEditStep}>
        <ReviewField label="What you want content to lead to" value={data.contentGoal} />
      </SectionCard>

      {/* Your Offer */}
      <SectionCard title="Your Offer" stepIndex={3} onEdit={onEditStep}>
        <ReviewField label="What you sell and how content connects" value={data.offerAndContent} />
      </SectionCard>

      {/* Go-To Person */}
      <SectionCard title="Go-To Person" stepIndex={4} onEdit={onEditStep}>
        <ReviewField label="What people come to you for" value={data.goToPersonFor} />
      </SectionCard>

      {/* Fire Topics */}
      <SectionCard title="Your Fire Topics" stepIndex={5} onEdit={onEditStep}>
        <ReviewField label="What you could talk about for 30 minutes" value={data.talkWithoutPreparing} />
      </SectionCard>

      {/* Your Audience */}
      <SectionCard title="Your Audience" stepIndex={6} onEdit={onEditStep}>
        <ReviewField label="Your audience and their painful problem" value={data.audienceAndProblem} />
      </SectionCard>

      {/* Your Perspective */}
      <SectionCard title="Your Perspective" stepIndex={7} onEdit={onEditStep}>
        <ReviewField label="Your unique perspective" value={data.uniquePerspective} />
      </SectionCard>

      {/* Your Stories */}
      <SectionCard title="Your Stories" stepIndex={8} onEdit={onEditStep}>
        <ReviewField label="Personal stories that shaped you" value={data.personalStories} />
      </SectionCard>

      {/* Known For & Against */}
      <SectionCard title="Known For & Against" stepIndex={9} onEdit={onEditStep}>
        <ReviewField label="Known for and against" value={data.knownForAndAgainst} />
      </SectionCard>

      {/* Content History */}
      <SectionCard title="Content History" stepIndex={10} onEdit={onEditStep}>
        <ReviewField label="Content creation history" value={data.contentHistory} />
      </SectionCard>

      {/* Time & Energy */}
      <SectionCard title="Time & Energy" stepIndex={11} onEdit={onEditStep}>
        <ReviewField label="Time and energy for content" value={data.timeAndEnergy} />
      </SectionCard>

      {/* Easy vs. Draining */}
      <SectionCard title="Easy vs. Draining" stepIndex={12} onEdit={onEditStep}>
        <ReviewField label="Easy vs. draining parts" value={data.easyVsDraining} />
      </SectionCard>

      {/* Writing Samples (only show if filled) */}
      {data.writtenSamples && (
        <SectionCard title="Writing Samples" stepIndex={13} onEdit={onEditStep}>
          <ReviewField label="Written content samples" value={data.writtenSamples} />
        </SectionCard>
      )}

      {/* Your Inspiration */}
      <SectionCard title="Your Inspiration" stepIndex={14} onEdit={onEditStep}>
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

      {/* Your Core Message */}
      <SectionCard title="Your Core Message" stepIndex={15} onEdit={onEditStep}>
        <ReviewField label="Core message" value={data.coreMessage} />
      </SectionCard>
    </div>
  );
}
