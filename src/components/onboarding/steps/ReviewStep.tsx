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

      {/* Identity */}
      <SectionCard title={STEP_LABELS[0]} stepIndex={0} onEdit={onEditStep}>
        <ReviewField label="Name" value={data.name} />
        <ReviewField label="Background" value={data.background} />
        {data.neurodivergentProfile.length > 0 && (
          <div className="mb-3 last:mb-0">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Profile
            </span>
            <div className="flex flex-wrap gap-2 mt-1">
              {data.neurodivergentProfile.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1 text-sm"
                  style={{
                    backgroundColor: 'var(--color-accent-light)',
                    color: 'var(--color-accent-hover)',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Vision */}
      <SectionCard title={STEP_LABELS[1]} stepIndex={1} onEdit={onEditStep}>
        <ReviewField label="Content Goals" value={data.contentGoals} />
        <ReviewField label="12-Week Vision" value={data.twelveWeekVision} />
      </SectionCard>

      {/* Audience */}
      <SectionCard title={STEP_LABELS[2]} stepIndex={2} onEdit={onEditStep}>
        <ReviewField label="Ideal Viewer" value={data.idealViewer} />
        <ReviewField label="Problems Solved" value={data.problemsSolved} />
      </SectionCard>

      {/* Niche */}
      <SectionCard title={STEP_LABELS[3]} stepIndex={3} onEdit={onEditStep}>
        <ReviewField label="Industry" value={data.industry} />
        {data.keyTopics.length > 0 && (
          <div className="mb-3 last:mb-0">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Content Pillars
            </span>
            <div className="flex flex-wrap gap-2 mt-1">
              {data.keyTopics.map((topic) => (
                <span
                  key={topic}
                  className="px-3 py-1 text-sm"
                  style={{
                    backgroundColor: 'var(--color-accent-light)',
                    color: 'var(--color-accent-hover)',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Inspiration */}
      <SectionCard title={STEP_LABELS[4]} stepIndex={4} onEdit={onEditStep}>
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
      </SectionCard>

      {/* Voice Samples */}
      <SectionCard title={STEP_LABELS[5]} stepIndex={5} onEdit={onEditStep}>
        {data.noExistingContent ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Starting fresh - no existing content provided.
          </p>
        ) : data.voiceSamples.filter((s) => s.trim()).length > 0 ? (
          <div className="space-y-3">
            {data.voiceSamples
              .filter((s) => s.trim())
              .map((sample, i) => (
                <div
                  key={i}
                  className="p-3 text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <p className="whitespace-pre-wrap line-clamp-3">{sample}</p>
                </div>
              ))}
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {data.voiceSamples.filter((s) => s.trim()).length} sample(s) provided
            </p>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No samples added yet.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
