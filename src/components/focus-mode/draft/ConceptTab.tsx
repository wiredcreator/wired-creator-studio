'use client';

import type { IConceptAnswers } from '@/models/ContentIdea';
import VoiceInputWrapper from '@/components/VoiceInputWrapper';

interface ConceptTabProps {
  conceptAnswers: IConceptAnswers;
  setConceptAnswers: (answers: IConceptAnswers) => void;
  rawNotes: string;
  setRawNotes: (notes: string) => void;
  onSave: () => void;
  onAutoGenerate: () => void;
  isSaving: boolean;
  isGenerating: boolean;
  onMarkChanged: () => void;
}

const FIELDS = [
  {
    key: 'whoIsThisFor' as const,
    label: 'Who is this video for?',
    description: 'Explain the audience this video is targeted for.',
  },
  {
    key: 'whatWillTheyLearn' as const,
    label: "What do they believe right now that's holding them back?",
    description: 'The current assumption or misconception they have before watching.',
  },
  {
    key: 'whyShouldTheyCare' as const,
    label: 'What do they walk away with?',
    description: 'The shift, takeaway, or new understanding they have after watching.',
  },
];

export default function ConceptTab({
  conceptAnswers,
  setConceptAnswers,
  rawNotes,
  setRawNotes,
  onSave,
  onAutoGenerate,
  isSaving,
  isGenerating,
  onMarkChanged,
}: ConceptTabProps) {
  const wordCount = rawNotes.trim() ? rawNotes.trim().split(/\s+/).length : 0;

  const handleFieldChange = (key: keyof IConceptAnswers, value: string) => {
    setConceptAnswers({ ...conceptAnswers, [key]: value });
    onMarkChanged();
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
      <div className="space-y-6">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-semibold text-[var(--color-text)]">
              {field.label}
            </label>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{field.description}</p>
            <VoiceInputWrapper onTranscript={(text) => handleFieldChange(field.key, conceptAnswers[field.key] ? conceptAnswers[field.key] + '\n' + text : text)}>
              <textarea
                value={conceptAnswers[field.key]}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                rows={3}
                className="mt-2 w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none ring-0"
                placeholder="Start typing..."
              />
            </VoiceInputWrapper>
          </div>
        ))}

        {/* Raw Notes */}
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text)]">
            Raw notes &amp; ideas
          </label>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Anything goes, stream of consciousness, sparks, half-formed thoughts.
          </p>
          <VoiceInputWrapper onTranscript={(text) => { setRawNotes(rawNotes ? rawNotes + '\n' + text : text); onMarkChanged(); }}>
            <textarea
              value={rawNotes}
              onChange={(e) => { setRawNotes(e.target.value); onMarkChanged(); }}
              rows={5}
              className="mt-2 w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none ring-0"
              placeholder="Start writing... get it out, don't worry about making it perfect."
            />
          </VoiceInputWrapper>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{wordCount} words</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-hover)] disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save changes'}
        </button>
        <button
          onClick={onAutoGenerate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-hover)] disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
          </svg>
          {isGenerating ? 'Generating...' : 'Auto-generate'}
        </button>
      </div>
    </div>
  );
}
